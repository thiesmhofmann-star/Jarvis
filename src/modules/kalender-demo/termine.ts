import { sitzungsSpeicher } from "@/lib/sitzungs-speicher";
import {
  berlinDatum,
  berlinZeitpunkt,
  formatiereTag,
  tagePlus,
} from "@/lib/zeit";
import {
  istVorkommenstag,
  vorkommen,
  vorkommenZwischen,
  type Serie,
} from "./serien";

/** Ein einzelner Termin im Demo-Kalender. Alles erfunden, nichts davon ist echt. */
export type Termin = {
  id: string;
  titel: string;
  beginn: string; // ISO-Zeitpunkt
  ende: string; // ISO-Zeitpunkt
  demo: true;
};

/**
 * Ein Eintrag, wie ihn die Werkzeuge liefern: ein Einzeltermin oder ein
 * Vorkommen eines Dauertermins. Bei einem Vorkommen ist `id` die Serien-ID
 * und `vorkommen` der Tag, an dem es planmäßig stattfindet. Beides zusammen
 * benennt genau dieses eine Mal, etwa für termin_aendern und termin_absagen.
 */
export type TerminAnsicht = Termin & { vorkommen?: string };

/** „nur dieses Mal“ oder „ab diesem Termin immer“, nur bei Dauerterminen */
export const UMFAENGE = ["nur_dieses_mal", "ab_diesem_termin"] as const;
export type Umfang = (typeof UMFAENGE)[number];

type Kalender = { termine: Termin[]; serien: Serie[]; befuellt: boolean };

/** Erfundene Einträge für den Tag, an dem eine Sitzung beginnt. */
function befuelle(kalender: Kalender, jetzt: Date) {
  const heute = berlinDatum(jetzt);
  const termin = (
    titel: string,
    von: [number, number],
    bis: [number, number],
  ): Termin => ({
    id: crypto.randomUUID(),
    titel,
    beginn: berlinZeitpunkt(heute, ...von).toISOString(),
    ende: berlinZeitpunkt(heute, ...bis).toISOString(),
    demo: true,
  });
  kalender.termine.push(
    termin("Team-Besprechung", [9, 0], [9, 30]),
    termin("Mittagspause", [12, 30], [13, 30]),
    termin("Laufen im Park", [18, 0], [19, 0]),
  );
  // Ein Dauertermin, der heute stattfindet und schon seit drei Wochen läuft.
  // So gibt es frühere Vorkommen, die „ab diesem Termin immer“ nicht ändert.
  kalender.serien.push({
    id: crypto.randomUUID(),
    titel: "Training",
    startTag: tagePlus(heute, -21),
    stunde: 20,
    minute: 0,
    dauerMinuten: 90,
    ausnahmen: new Set(),
    abweichungen: new Map(),
    demo: true,
  });
}

// Jede Sitzung bekommt ihren eigenen Demo-Kalender im Arbeitsspeicher.
// Er verschwindet mit der Sitzung; nichts wird dauerhaft gespeichert.
const kalender = sitzungsSpeicher<Kalender>(() => ({
  termine: [],
  serien: [],
  befuellt: false,
}));

export function kalenderVon(nutzerId: string, jetzt: Date): Kalender {
  const eintrag = kalender.hole(nutzerId);
  if (!eintrag.befuellt) {
    befuelle(eintrag, jetzt);
    eintrag.befuellt = true;
  }
  return eintrag;
}

/**
 * Obergrenze, damit niemand den Speicher der öffentlichen Demo füllen kann.
 * Einzeltermine und Dauertermine zählen zusammen; eine Serie zählt als 1.
 */
export const MAX_TERMINE = 50;

/** Obergrenze für abgesagte und einzeln geänderte Vorkommen je Dauertermin */
export const MAX_EINZELAENDERUNGEN = 20;

export function pruefePlatz(k: Kalender) {
  if (k.termine.length + k.serien.length >= MAX_TERMINE) {
    throw new Error("Der Demo-Kalender ist voll.");
  }
}

export function pruefeEinzelaenderungen(serie: Serie) {
  if (serie.ausnahmen.size + serie.abweichungen.size >= MAX_EINZELAENDERUNGEN) {
    throw new Error(
      `„${serie.titel}“ hat schon zu viele einzelne Änderungen. Ändere den Dauertermin lieber ab einem Termin für jede Woche.`,
    );
  }
}

/** Alle Einträge, die zwischen von und bis (je einschließlich) stattfinden, nach Beginn sortiert. */
export function eintraegeZwischen(
  k: Kalender,
  von: string,
  bis: string,
): TerminAnsicht[] {
  const einzeln = k.termine
    .filter((t) => {
      const tag = berlinDatum(new Date(t.beginn));
      return tag >= von && tag <= bis;
    })
    .map((t) => ({ ...t }));
  const wiederholt = k.serien.flatMap((s) => vorkommenZwischen(s, von, bis));
  return [...einzeln, ...wiederholt].sort(
    (a, b) =>
      a.beginn.localeCompare(b.beginn) || a.titel.localeCompare(b.titel),
  );
}

/** Was termin_aendern und termin_absagen treffen: einen Einzeltermin oder ein Vorkommen. */
export type Ziel =
  | { art: "einzeltermin"; termin: Termin; ansicht: TerminAnsicht }
  | {
      art: "vorkommen";
      serie: Serie;
      vorkommen: string;
      umfang: Umfang;
      ansicht: TerminAnsicht;
    };

/** Sucht das Ziel einer Änderung oder Absage; sonst eine verständliche Fehlermeldung. */
export function findeZiel(
  k: Kalender,
  {
    id,
    vorkommen: tag,
    umfang,
  }: { id: string; vorkommen?: string; umfang?: Umfang },
): Ziel {
  const termin = k.termine.find((t) => t.id === id);
  if (termin) {
    if (tag !== undefined || umfang !== undefined) {
      throw new Error(
        `„${termin.titel}“ ist ein einzelner Termin. „Nur dieses Mal“ oder „ab diesem Termin immer“ gibt es nur bei Dauerterminen.`,
      );
    }
    return { art: "einzeltermin", termin, ansicht: { ...termin } };
  }

  const serie = k.serien.find((s) => s.id === id);
  if (!serie) throw new Error("Diesen Termin gibt es nicht im Demo-Kalender.");
  if (tag === undefined || umfang === undefined) {
    throw new Error(
      `„${serie.titel}“ ist ein Dauertermin. Dafür brauche ich den Tag des Vorkommens und ob es nur dieses Mal oder ab diesem Termin immer gilt.`,
    );
  }
  if (!istVorkommenstag(serie, tag)) {
    throw new Error(
      `„${serie.titel}“ findet am ${formatiereTag(tag)}, nicht statt.`,
    );
  }
  return {
    art: "vorkommen",
    serie,
    vorkommen: tag,
    umfang,
    ansicht: vorkommen(serie, tag),
  };
}
