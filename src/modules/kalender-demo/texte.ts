import { berlinDatum, formatiereTag, formatiereUhrzeit } from "@/lib/zeit";
import type { TerminAnsicht, Umfang } from "./termine";

/** Texte für die Freigabe-Karten des Demo-Kalenders. */

export const KALENDER = "Demo-Kalender (nur im Arbeitsspeicher)";

/** „Freitag, 16. Oktober, 10:00 Uhr“ */
export function wannText(beginn: string) {
  const zeitpunkt = new Date(beginn);
  return `${formatiereTag(berlinDatum(zeitpunkt))}, ${formatiereUhrzeit(zeitpunkt)} Uhr`;
}

/**
 * „Samstag, 10. Oktober, 20:00 bis 21:30 Uhr“. Ausgeschrieben „bis“ statt
 * Strich, damit ein Screenreader die Zeitspanne eindeutig vorliest.
 */
export function zeitraumText(t: Pick<TerminAnsicht, "beginn" | "ende">) {
  const beginn = new Date(t.beginn);
  return `${formatiereTag(berlinDatum(beginn))}, ${formatiereUhrzeit(beginn)} bis ${formatiereUhrzeit(new Date(t.ende))} Uhr`;
}

/** Stand vor oder nach einer Änderung; mit Titel, wenn sich der Titel ändert. */
export function standText(t: TerminAnsicht, mitTitel: boolean) {
  return mitTitel ? `„${t.titel}“, ${zeitraumText(t)}` : zeitraumText(t);
}

/** „Nur am Dienstag, 13. Oktober“ oder „Ab Dienstag, 13. Oktober jede Woche“ */
export function geltungText(umfang: Umfang, vorkommen: string) {
  return umfang === "nur_dieses_mal"
    ? `Nur am ${formatiereTag(vorkommen)}`
    : `Ab ${formatiereTag(vorkommen)} jede Woche`;
}
