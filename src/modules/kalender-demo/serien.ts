import {
  berlinDatum,
  berlinTeile,
  berlinZeitpunkt,
  tagePlus,
  wochentagVon,
} from "@/lib/zeit";
import type { TerminAnsicht } from "./termine";

/**
 * Dauertermine im Demo-Kalender: nur wöchentlich, wie im Ticket 9D verlangt.
 * Im Anschluss-Block rechnet Google die Wiederholungen selbst aus; diese
 * Datei fällt dann weg (docs/architektur.md, Abschnitt 16).
 */

/** Was an einem einzelnen Vorkommen anders ist („nur dieses Mal“ geändert). */
export type Abweichung = { titel: string; beginn: string; ende: string };

/**
 * Ein Dauertermin: jede Woche am selben Wochentag zur selben Berliner
 * Uhrzeit. Die Uhrzeit steht als Ortszeit, nicht als fester Zeitpunkt. So
 * bleibt 18 Uhr auch nach der Zeitumstellung 18 Uhr.
 */
export type Serie = {
  id: string;
  titel: string;
  /** Tag des ersten Vorkommens („JJJJ-MM-TT“); legt auch den Wochentag fest */
  startTag: string;
  /** Letzter möglicher Tag; ohne Angabe läuft die Serie ohne Ende */
  endTag?: string;
  stunde: number;
  minute: number;
  dauerMinuten: number;
  /** Tage, an denen die Serie ausfällt („nur dieses Mal“ abgesagt) */
  ausnahmen: Set<string>;
  /** Einzeln geänderte Vorkommen, je planmäßigem Tag */
  abweichungen: Map<string, Abweichung>;
  demo: true;
};

/** Planmäßige Tage zwischen von und bis (je einschließlich); Ausnahmen zählen hier noch mit. */
function regelTage(serie: Serie, von: string, bis: string): string[] {
  const letzter = serie.endTag && serie.endTag < bis ? serie.endTag : bis;
  const erster = von > serie.startTag ? von : serie.startTag;
  const versatz = (wochentagVon(serie.startTag) - wochentagVon(erster) + 7) % 7;
  const tage: string[] = [];
  for (let tag = tagePlus(erster, versatz); tag <= letzter;) {
    tage.push(tag);
    tag = tagePlus(tag, 7);
  }
  return tage;
}

/** Findet die Serie an diesem Tag statt (planmäßig und nicht abgesagt)? */
export function istVorkommenstag(serie: Serie, tag: string): boolean {
  return regelTage(serie, tag, tag).length === 1 && !serie.ausnahmen.has(tag);
}

/** Das Vorkommen an diesem Tag, wie es nach dem Wochenrhythmus wäre. */
export function planmaessig(serie: Serie, tag: string): TerminAnsicht {
  const beginn = berlinZeitpunkt(tag, serie.stunde, serie.minute);
  return {
    id: serie.id,
    titel: serie.titel,
    beginn: beginn.toISOString(),
    ende: new Date(
      beginn.getTime() + serie.dauerMinuten * 60_000,
    ).toISOString(),
    demo: true,
    vorkommen: tag,
  };
}

/** Das Vorkommen, wie es im Kalender steht: mit Einzeländerung, falls es eine gibt. */
export function vorkommen(serie: Serie, tag: string): TerminAnsicht {
  return { ...planmaessig(serie, tag), ...serie.abweichungen.get(tag) };
}

/** Alle Vorkommen, die zwischen von und bis (je einschließlich) stattfinden. */
export function vorkommenZwischen(
  serie: Serie,
  von: string,
  bis: string,
): TerminAnsicht[] {
  // Einzeln geänderte Vorkommen können in den Zeitraum hinein- oder aus ihm
  // herausgeschoben sein, deshalb kommen sie immer mit in die Prüfung.
  const tage = new Set([
    ...regelTage(serie, von, bis),
    ...serie.abweichungen.keys(),
  ]);
  return [...tage]
    .filter((tag) => istVorkommenstag(serie, tag))
    .map((tag) => vorkommen(serie, tag))
    .filter((t) => {
      const tag = berlinDatum(new Date(t.beginn));
      return tag >= von && tag <= bis;
    });
}

/** Gibt es vor diesem Tag noch ein Vorkommen, das nicht abgesagt ist? */
export function hatVorkommenVor(serie: Serie, tag: string): boolean {
  return regelTage(serie, serie.startTag, tagePlus(tag, -1)).some(
    (t) => !serie.ausnahmen.has(t),
  );
}

/**
 * Lässt die Serie am Tag vor `tag` enden. Ausnahmen und Einzeländerungen ab
 * diesem Tag fallen weg, weil es diese Vorkommen nicht mehr gibt.
 */
export function beendeVor(serie: Serie, tag: string) {
  serie.endTag = tagePlus(tag, -1);
  for (const t of serie.ausnahmen) if (t >= tag) serie.ausnahmen.delete(t);
  for (const t of serie.abweichungen.keys()) {
    if (t >= tag) serie.abweichungen.delete(t);
  }
}

/** Neue Serie, deren erstes Vorkommen bei `beginn` liegt. */
export function neueSerie({
  titel,
  beginn,
  dauerMinuten,
  endTag,
}: {
  titel: string;
  beginn: Date;
  dauerMinuten: number;
  endTag?: string;
}): Serie {
  const { stunde, minute } = berlinTeile(beginn);
  return {
    id: crypto.randomUUID(),
    titel,
    startTag: berlinDatum(beginn),
    ...(endTag ? { endTag } : {}),
    stunde,
    minute,
    dauerMinuten,
    ausnahmen: new Set(),
    abweichungen: new Map(),
    demo: true,
  };
}
