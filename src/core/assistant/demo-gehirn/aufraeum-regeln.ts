import type {
  DauerterminAnsicht,
  DauertermineAnzeigenErgebnis,
  TerminAbsagenErgebnis,
  TerminAendernErgebnis,
} from "@/modules/kalender-demo";
import {
  berlinDatum,
  berlinZeitpunkt,
  formatiereTag,
  formatiereUhrzeit,
  formatiereWochentag,
  tagePlus,
  wochentagVon,
} from "@/lib/zeit";
import type { GehirnAntwort, Nachricht } from "../gehirn";
import { type DemoRegel, type WerkzeugSchritt, rufe, sage } from "./regel";
import {
  findeDauer,
  findeUhrzeiten,
  findeUmbenennung,
  findeWochentag,
  zerlege,
} from "./verstehen";

/**
 * Kalender aufräumen (Ticket F): Jarvis geht die Dauertermine einzeln durch
 * und fragt jeweils „Stimmt das noch?“. Der Durchgang läuft über mehrere
 * Nachrichten. Das Demo-Gehirn merkt sich nichts; es liest den Stand aus dem
 * Gespräch: aus der Liste, die `dauertermine_anzeigen` geliefert hat, und
 * aus „Fester Termin 2 von 3“ in seiner letzten Frage. Claude braucht diesen
 * Trick später nicht.
 */

const MARKE = /Fester Termin (\d+) von (\d+)/;
const START = "„Lass uns meine festen Termine durchgehen“";

type Durchgang = {
  liste: DauerterminAnsicht[];
  /** Position des aktuellen Dauertermins in der Liste */
  index: number;
  /** Wo im Gespräch die Liste gelesen wurde */
  ab: number;
};

/** Läuft gerade ein Durchgang? Nur, wenn Jarvis' letzte Nachricht eine Durchgangs-Frage war. */
function laufenderDurchgang(davor: readonly Nachricht[]): Durchgang | null {
  const letzteJarvis = davor.findLast((n) => n.rolle === "jarvis");
  const marke =
    letzteJarvis?.rolle === "jarvis" && letzteJarvis.text.match(MARKE);
  if (!marke) return null;
  const ab = davor.findLastIndex(
    (n) =>
      n.rolle === "werkzeug" &&
      n.name === "dauertermine_anzeigen" &&
      n.ausgang.art === "ergebnis",
  );
  const schritt = davor[ab];
  if (schritt?.rolle !== "werkzeug" || schritt.ausgang.art !== "ergebnis") {
    return null;
  }
  const { dauertermine } = schritt.ausgang
    .ergebnis as DauertermineAnzeigenErgebnis;
  const index = Number(marke[1]) - 1;
  return dauertermine[index] ? { liste: dauertermine, index, ab } : null;
}

function zeitspanne(beginn: string, ende: string) {
  return `${formatiereUhrzeit(new Date(beginn))}–${formatiereUhrzeit(new Date(ende))} Uhr`;
}

/** „Fester Termin 1 von 3: „Training“, jeden Samstag, 20:00–21:30 Uhr. …“ */
function frage(d: Durchgang, jetzt: Date) {
  const t = d.liste[d.index]!;
  const n = t.naechstes;
  const tag = n.vorkommen ?? berlinDatum(new Date(n.beginn));
  const wann =
    tag === berlinDatum(jetzt)
      ? `heute, ${formatiereTag(tag)}`
      : formatiereTag(tag);
  return `Fester Termin ${d.index + 1} von ${d.liste.length}: „${t.titel}“, jeden ${t.wochentag}, ${zeitspanne(n.beginn, n.ende)}. Nächstes Mal: ${wann}. Stimmt das noch?`;
}

/** Was im Durchgang bisher geändert und entfernt wurde */
function bilanz(
  davor: readonly Nachricht[],
  ab: number,
  dazu?: WerkzeugSchritt,
) {
  const schritte = [...davor.slice(ab + 1), ...(dazu ? [dazu] : [])].filter(
    (n): n is WerkzeugSchritt =>
      n.rolle === "werkzeug" && n.ausgang.art === "ergebnis",
  );
  return {
    geaendert: schritte.filter((s) => s.name === "termin_aendern").length,
    entfernt: schritte.filter((s) => s.name === "termin_absagen").length,
  };
}

/** Nächste Frage oder, nach dem letzten Dauertermin, die Zusammenfassung */
function weiterImDurchgang(
  d: Durchgang,
  davor: readonly Nachricht[],
  jetzt: Date,
  dazu?: WerkzeugSchritt,
): string {
  const naechster = { ...d, index: d.index + 1 };
  if (naechster.index < d.liste.length) return frage(naechster, jetzt);
  const { geaendert, entfernt } = bilanz(davor, d.ab, dazu);
  const passt = d.liste.length - geaendert - entfernt;
  return `Fertig: Alle ${d.liste.length} festen Termine sind durchgegangen. Geändert: ${geaendert}, entfernt: ${entfernt}, unverändert: ${passt}.`;
}

/** Neuer Beginn: neuer Wochentag in derselben Woche wie das Vorkommen und/oder neue Uhrzeit */
function neuerBeginn(
  t: DauerterminAnsicht,
  wochentag: number | null,
  zeit: { stunde: number; minute: number } | undefined,
) {
  const tag = t.naechstes.vorkommen!;
  const neuerTag =
    wochentag === null
      ? tag
      : tagePlus(tag, (wochentag - wochentagVon(tag) + 7) % 7);
  const [stunde, minute] = t.uhrzeit.split(":").map(Number) as [number, number];
  return berlinZeitpunkt(
    neuerTag,
    zeit?.stunde ?? stunde,
    zeit?.minute ?? minute,
  ).toISOString();
}

/** Sätze, die sicher etwas anderes wollen, unterbrechen den Durchgang. */
const ANDERES =
  /^(was|wann|wie|wer|welche|zeig|trag|neue|notiz|antworte|verschieb|benenne|lass)\b/i;

function antwortImDurchgang(
  text: string,
  d: Durchgang,
  davor: readonly Nachricht[],
  jetzt: Date,
): GehirnAntwort | null {
  const w = zerlege(text);
  if (ANDERES.test(text.trim()) || w.klein.length > 12) return null;
  const satz = ` ${w.klein.join(" ")} `;
  const t = d.liste[d.index]!;
  const ziel = {
    id: t.naechstes.id,
    vorkommen: t.naechstes.vorkommen!,
    umfang: "ab_diesem_termin",
  };

  if (/ (stopp|stop|abbrechen|aufhören|hör auf|genug|schluss) /.test(satz)) {
    const { geaendert, entfernt } = bilanz(davor, d.ab);
    return sage(
      `In Ordnung, wir hören hier auf. Durchgegangen: ${d.index} von ${d.liste.length}. Geändert: ${geaendert}, entfernt: ${entfernt}. Mit ${START} fangen wir wieder vorn an.`,
    );
  }
  if (
    / (gibt es nicht mehr|gibts nicht mehr|fällt weg|kann weg|weg damit|brauche ich nicht mehr|mache ich nicht mehr|streichen|absagen|lösch|lösche|löschen|entfernen) /.test(
      satz,
    )
  ) {
    return rufe("termin_absagen", ziel);
  }

  const zeit = findeUhrzeiten(w).at(-1);
  const dauer = findeDauer(w)?.minuten;
  const titel = findeUmbenennung(w)?.titel;
  const wochentag = findeWochentag(w);
  if (zeit || dauer || titel || wochentag !== null) {
    if (dauer !== undefined && (dauer < 5 || dauer > 24 * 60)) {
      return sage(
        `Ein Termin dauert im Demo-Kalender mindestens 5 Minuten und höchstens 24 Stunden. (${frage(d, jetzt)})`,
      );
    }
    return rufe("termin_aendern", {
      ...ziel,
      ...(zeit || wochentag !== null
        ? { beginn: neuerBeginn(t, wochentag, zeit) }
        : {}),
      ...(dauer ? { dauerMinuten: dauer } : {}),
      ...(titel ? { titel } : {}),
    });
  }

  if (/ (nein|nö|stimmt nicht|passt nicht|falsch) /.test(satz)) {
    return sage(
      `Was stimmt bei „${t.titel}“ nicht mehr? Sag mir zum Beispiel „ab jetzt 19 Uhr“, „ab jetzt mittwochs“, „dauert 2 Stunden“ oder „gibt es nicht mehr“. (Fester Termin ${d.index + 1} von ${d.liste.length})`,
    );
  }
  if (
    / (passt|stimmt|ja|jep|richtig|genau|ok|okay|weiter|klar|alles gut|bleibt) /.test(
      satz,
    )
  ) {
    return sage(weiterImDurchgang(d, davor, jetzt));
  }
  return null;
}

export const kalenderAufraeumen: DemoRegel = {
  werkzeuge: ["dauertermine_anzeigen", "termin_aendern", "termin_absagen"],
  erkenne(text, jetzt, davor) {
    const satz = ` ${zerlege(text).klein.join(" ")} `;
    const start =
      / (feste|festen|regelmäßigen|wiederkehrenden) termine /.test(satz) ||
      / (dauertermine|kalender aufräumen) /.test(satz);
    if (
      start &&
      / (durchgehen|durchgucken|anschauen|ansehen|prüfen|aufräumen|checken) /.test(
        satz,
      )
    ) {
      return rufe("dauertermine_anzeigen", {});
    }
    const d = laufenderDurchgang(davor);
    return d ? antwortImDurchgang(text, d, davor, jetzt) : null;
  },
  weiter(schritt, _text, jetzt, _bisher, davor) {
    const { ausgang } = schritt;
    if (schritt.name === "dauertermine_anzeigen") {
      if (ausgang.art !== "ergebnis") {
        return sage("Den Demo-Kalender konnte ich gerade nicht lesen.");
      }
      const { dauertermine } = ausgang.ergebnis as DauertermineAnzeigenErgebnis;
      if (dauertermine.length === 0) {
        return sage("Im Demo-Kalender gibt es keine festen Termine.");
      }
      const anzahl =
        dauertermine.length === 1
          ? "deinen festen Termin"
          : `deine ${dauertermine.length} festen Termine`;
      return sage(
        `Wir gehen ${anzahl} durch. Antworte jeweils mit „passt“, mit einer Änderung wie „ab jetzt 19 Uhr“ oder „dauert 2 Stunden“, mit „gibt es nicht mehr“ oder mit „Stopp“.\n\n${frage({ liste: dauertermine, index: 0, ab: 0 }, jetzt)}`,
      );
    }

    const d = laufenderDurchgang(davor);
    if (!d) return sage("Erledigt.");
    const t = d.liste[d.index]!;
    let ergebnis: string;
    if (ausgang.art === "abgelehnt") {
      ergebnis = `In Ordnung, „${t.titel}“ bleibt, wie es war.`;
    } else if (ausgang.art === "fehler") {
      ergebnis = `Das ging nicht: ${ausgang.meldung}`;
    } else if (schritt.name === "termin_absagen") {
      const { ganzeSerie } = ausgang.ergebnis as TerminAbsagenErgebnis;
      ergebnis = ganzeSerie
        ? `Entfernt: „${t.titel}“ ist ganz aus dem Demo-Kalender verschwunden.`
        : `Entfernt: „${t.titel}“ steht ab ${formatiereTag(t.naechstes.vorkommen!)}, nicht mehr im Demo-Kalender.`;
    } else {
      const { termin } = ausgang.ergebnis as TerminAendernErgebnis;
      const tag = berlinDatum(new Date(termin.beginn));
      ergebnis = `Geändert: „${termin.titel}“ ist ab ${formatiereTag(tag)}, jeden ${formatiereWochentag(tag)} von ${formatiereUhrzeit(new Date(termin.beginn))} bis ${formatiereUhrzeit(new Date(termin.ende))} Uhr.`;
    }
    return sage(
      `${ergebnis}\n\n${weiterImDurchgang(d, davor, jetzt, schritt)}`,
    );
  },
};
