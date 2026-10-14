import { z } from "zod";
import { berlinDatum, tagePlus } from "@/lib/zeit";
import type { WerkzeugKontext, WriteTool } from "../vertrag";
import {
  beendeVor,
  hatVorkommenVor,
  neueSerie,
  planmaessig,
  vorkommen,
} from "./serien";
import {
  UMFAENGE,
  findeZiel,
  kalenderVon,
  pruefeEinzelaenderungen,
  pruefePlatz,
  type TerminAnsicht,
  type Umfang,
} from "./termine";
import { KALENDER, geltungText, standText, zeitraumText } from "./texte";

/** Termine ändern und absagen. Beides sind Schreib-Werkzeuge: Sie laufen nur nach Freigabe. */

/** Welcher Termin gemeint ist; bei Dauerterminen auch welches Vorkommen und wie weit. */
const zielEingabe = {
  /** ID des Einzeltermins oder des Dauertermins (aus termine_am_tag oder termine_suchen) */
  id: z.string().min(1),
  /** Nur bei Dauerterminen: planmäßiger Tag des Vorkommens („JJJJ-MM-TT“) */
  vorkommen: z.iso.date().optional(),
  /** Nur bei Dauerterminen */
  umfang: z.enum(UMFAENGE).optional(),
};

// ---------- Ändern ----------

const terminAendernEingabe = z.object({
  ...zielEingabe,
  /** Neuer Beginn; ohne Angabe bleibt er */
  beginn: z.iso.datetime({ offset: true }).optional(),
  /** Neue Dauer; ohne Angabe bleibt sie */
  dauerMinuten: z
    .number()
    .int()
    .min(5)
    .max(24 * 60)
    .optional(),
  /** Neuer Titel; ohne Angabe bleibt er */
  titel: z.string().trim().min(1).max(100).optional(),
});

type AendernEingabe = z.output<typeof terminAendernEingabe>;

export type TerminAendernErgebnis = {
  vorher: TerminAnsicht;
  termin: TerminAnsicht;
  umfang?: Umfang;
};

/**
 * Rechnet aus, was sich ändert, und prüft alles, was schiefgehen kann. Läuft
 * für die Vorschau und noch einmal beim Ausführen, weil sich dazwischen
 * etwas geändert haben kann.
 */
function planeAenderung(eingabe: AendernEingabe, ctx: WerkzeugKontext) {
  const kalender = kalenderVon(ctx.nutzerId, ctx.jetzt);
  const ziel = findeZiel(kalender, eingabe);
  if (
    eingabe.beginn === undefined &&
    eingabe.dauerMinuten === undefined &&
    eingabe.titel === undefined
  ) {
    throw new Error("Sag mir, was sich ändern soll: Beginn, Dauer oder Titel.");
  }

  const abHier = ziel.art === "vorkommen" && ziel.umfang === "ab_diesem_termin";
  // „Ab diesem Termin immer“ ändert den Wochenrhythmus. Ausgangspunkt ist
  // deshalb das planmäßige Vorkommen, nicht eine einzelne Abweichung davon.
  const vorher = abHier
    ? planmaessig(ziel.serie, ziel.vorkommen)
    : ziel.ansicht;
  const dauerMinuten =
    eingabe.dauerMinuten ??
    (Date.parse(vorher.ende) - Date.parse(vorher.beginn)) / 60_000;
  const beginn = new Date(eingabe.beginn ?? vorher.beginn);
  const nachher: TerminAnsicht = {
    ...vorher,
    titel: eingabe.titel ?? vorher.titel,
    beginn: beginn.toISOString(),
    ende: new Date(beginn.getTime() + dauerMinuten * 60_000).toISOString(),
  };
  if (
    nachher.titel === vorher.titel &&
    nachher.beginn === vorher.beginn &&
    nachher.ende === vorher.ende
  ) {
    throw new Error(`Bei „${vorher.titel}“ ändert sich damit nichts.`);
  }

  if (abHier) {
    // Höchstens 6 Tage: Sonst gäbe es in einer Woche zwei Vorkommen oder
    // eine Woche ohne, ohne dass es auf der Karte zu sehen ist.
    const neuerTag = berlinDatum(beginn);
    if (
      neuerTag < tagePlus(ziel.vorkommen, -6) ||
      neuerTag > tagePlus(ziel.vorkommen, 6)
    ) {
      throw new Error(
        "Einen Dauertermin kann ich ab einem Termin höchstens um 6 Tage verschieben.",
      );
    }
    if (hatVorkommenVor(ziel.serie, ziel.vorkommen)) pruefePlatz(kalender);
  }
  if (
    ziel.art === "vorkommen" &&
    ziel.umfang === "nur_dieses_mal" &&
    !ziel.serie.abweichungen.has(ziel.vorkommen)
  ) {
    pruefeEinzelaenderungen(ziel.serie);
  }
  return { kalender, ziel, vorher, nachher, dauerMinuten };
}

const terminAendern: WriteTool<typeof terminAendernEingabe> = {
  description:
    "Ändert Beginn, Dauer und/oder Titel eines Termins im Demo-Kalender. Mindestens eine Änderung ist nötig. Bei Dauerterminen zusätzlich vorkommen und umfang: nur_dieses_mal ändert nur dieses Vorkommen, ab_diesem_termin ändert es und alle späteren.",
  effect: "write",
  input: terminAendernEingabe,
  async preview(eingabe, ctx) {
    const { ziel, vorher, nachher } = planeAenderung(eingabe, ctx);
    const mitTitel = vorher.titel !== nachher.titel;
    const beschreibung =
      ziel.art === "einzeltermin"
        ? "Jarvis ändert diesen Termin in deinem Demo-Kalender."
        : ziel.umfang === "nur_dieses_mal"
          ? "Jarvis ändert diesen Dauertermin nur an einem Tag. In den anderen Wochen bleibt er, wie er ist."
          : "Jarvis ändert diesen Dauertermin ab diesem Tag für jede Woche. Frühere Termine bleiben, wie sie sind.";
    return {
      titel: "Termin ändern",
      beschreibung,
      daten: [
        { label: "Was", wert: vorher.titel },
        { label: "Bisher", wert: standText(vorher, mitTitel) },
        { label: "Neu", wert: standText(nachher, mitTitel) },
        ...(ziel.art === "vorkommen"
          ? [
              {
                label: "Gilt für",
                wert: geltungText(ziel.umfang, ziel.vorkommen),
              },
            ]
          : []),
        { label: "Kalender", wert: KALENDER },
      ],
    };
  },
  async execute(eingabe, ctx) {
    const { kalender, ziel, vorher, nachher, dauerMinuten } = planeAenderung(
      eingabe,
      ctx,
    );
    const { titel, beginn, ende } = nachher;

    if (ziel.art === "einzeltermin") {
      Object.assign(ziel.termin, { titel, beginn, ende });
      return {
        vorher,
        termin: { ...ziel.termin },
      } satisfies TerminAendernErgebnis;
    }

    const { serie, vorkommen: tag, umfang } = ziel;
    if (umfang === "nur_dieses_mal") {
      serie.abweichungen.set(tag, { titel, beginn, ende });
      return {
        vorher,
        termin: vorkommen(serie, tag),
        umfang,
      } satisfies TerminAendernErgebnis;
    }

    // Ab diesem Termin immer: Die alte Serie endet davor, eine neue beginnt
    // hier. Gibt es davor kein Vorkommen, wird die Serie einfach ersetzt.
    const neu = neueSerie({
      titel,
      beginn: new Date(beginn),
      dauerMinuten,
      ...(serie.endTag ? { endTag: serie.endTag } : {}),
    });
    if (hatVorkommenVor(serie, tag)) {
      beendeVor(serie, tag);
      kalender.serien.push(neu);
    } else {
      neu.id = serie.id;
      kalender.serien.splice(kalender.serien.indexOf(serie), 1, neu);
    }
    return {
      vorher,
      termin: vorkommen(neu, neu.startTag),
      umfang,
    } satisfies TerminAendernErgebnis;
  },
};

// ---------- Absagen ----------

const terminAbsagenEingabe = z.object(zielEingabe);

type AbsagenEingabe = z.output<typeof terminAbsagenEingabe>;

export type TerminAbsagenErgebnis = {
  termin: TerminAnsicht;
  umfang?: Umfang;
  /** true, wenn der Dauertermin dadurch ganz verschwindet */
  ganzeSerie: boolean;
};

function planeAbsage(eingabe: AbsagenEingabe, ctx: WerkzeugKontext) {
  const kalender = kalenderVon(ctx.nutzerId, ctx.jetzt);
  const ziel = findeZiel(kalender, eingabe);
  const ganzeSerie =
    ziel.art === "vorkommen" &&
    ziel.umfang === "ab_diesem_termin" &&
    !hatVorkommenVor(ziel.serie, ziel.vorkommen);
  if (
    ziel.art === "vorkommen" &&
    ziel.umfang === "nur_dieses_mal" &&
    !ziel.serie.abweichungen.has(ziel.vorkommen)
  ) {
    pruefeEinzelaenderungen(ziel.serie);
  }
  return { kalender, ziel, ganzeSerie };
}

const terminAbsagen: WriteTool<typeof terminAbsagenEingabe> = {
  description:
    "Sagt einen Termin ab, das heißt: entfernt ihn aus dem Demo-Kalender. Benachrichtigt niemanden. Bei Dauerterminen zusätzlich vorkommen und umfang: nur_dieses_mal lässt nur dieses Vorkommen ausfallen, ab_diesem_termin beendet den Dauertermin vor diesem Vorkommen.",
  effect: "write",
  input: terminAbsagenEingabe,
  async preview(eingabe, ctx) {
    const { ziel, ganzeSerie } = planeAbsage(eingabe, ctx);
    const beschreibung =
      ziel.art === "einzeltermin"
        ? "Jarvis entfernt diesen Termin aus deinem Demo-Kalender und benachrichtigt niemanden."
        : ziel.umfang === "nur_dieses_mal"
          ? "Jarvis nimmt diesen Dauertermin nur an einem Tag aus deinem Demo-Kalender und benachrichtigt niemanden. In den anderen Wochen bleibt er."
          : ganzeSerie
            ? "Jarvis nimmt diesen Dauertermin ganz aus deinem Demo-Kalender und benachrichtigt niemanden."
            : "Jarvis nimmt diesen Dauertermin ab diesem Tag aus deinem Demo-Kalender und benachrichtigt niemanden. Frühere Termine bleiben.";
    return {
      titel: "Termin absagen",
      beschreibung,
      daten: [
        { label: "Was", wert: ziel.ansicht.titel },
        { label: "Wann", wert: zeitraumText(ziel.ansicht) },
        ...(ziel.art === "vorkommen"
          ? [
              {
                label: "Fällt weg",
                wert: geltungText(ziel.umfang, ziel.vorkommen),
              },
            ]
          : []),
        { label: "Kalender", wert: KALENDER },
      ],
    };
  },
  async execute(eingabe, ctx) {
    const { kalender, ziel, ganzeSerie } = planeAbsage(eingabe, ctx);

    if (ziel.art === "einzeltermin") {
      kalender.termine.splice(kalender.termine.indexOf(ziel.termin), 1);
      return {
        termin: ziel.ansicht,
        ganzeSerie: false,
      } satisfies TerminAbsagenErgebnis;
    }

    const { serie, vorkommen: tag, umfang } = ziel;
    if (umfang === "nur_dieses_mal") {
      serie.ausnahmen.add(tag);
      serie.abweichungen.delete(tag);
    } else if (ganzeSerie) {
      kalender.serien.splice(kalender.serien.indexOf(serie), 1);
    } else {
      beendeVor(serie, tag);
    }
    return {
      termin: ziel.ansicht,
      umfang,
      ganzeSerie,
    } satisfies TerminAbsagenErgebnis;
  },
};

export const pflegeWerkzeuge = {
  termin_aendern: terminAendern,
  termin_absagen: terminAbsagen,
};
