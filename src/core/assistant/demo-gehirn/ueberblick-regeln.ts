import type { AufgabenAnzeigenErgebnis } from "@/modules/aufgaben-demo";
import type { TermineAmTagErgebnis } from "@/modules/kalender-demo";
import { berlinDatum, formatiereTag } from "@/lib/zeit";
import { fristBeschreibung } from "./aufgaben-regeln";
import { terminZeile } from "./kalender-regeln";
import { type DemoRegel, rufe, sage } from "./regel";
import { findeTag, zerlege } from "./verstehen";

/**
 * Tagesüberblick: Termine und fällige Aufgaben eines Tages in einer Antwort.
 * Wie später bei Claude in zwei Lese-Schritten, erst der Kalender, dann die
 * Aufgaben. Nur lesen, nichts ändert sich.
 */

function verstehe(text: string, jetzt: Date) {
  const w = zerlege(text);
  const satz = ` ${w.klein.join(" ")} `;
  const tag = findeTag(w, jetzt);
  const gruss = / guten morgen /.test(satz);
  const gefragt =
    gruss ||
    / (briefing|tagesüberblick|überblick|tagesplan) /.test(satz) ||
    // „Wie sieht mein Tag aus?“, „Wie sieht morgen aus?“, aber nicht das Wetter
    (/ wie sieht /.test(satz) &&
      / aus /.test(satz) &&
      (tag !== null || / tag /.test(satz)) &&
      !/ wetter /.test(satz));
  return gefragt ? { tag: tag?.datum ?? berlinDatum(jetzt), gruss } : null;
}

export const tagesueberblick: DemoRegel = {
  werkzeuge: ["termine_am_tag", "aufgaben_anzeigen"],
  erkenne(text, jetzt) {
    const gefragt = verstehe(text, jetzt);
    return gefragt ? rufe("termine_am_tag", { tag: gefragt.tag }) : null;
  },
  weiter(schritt, text, jetzt, bisher) {
    const fehler = "Den Überblick konnte ich gerade nicht zusammenstellen.";
    if (schritt.ausgang.art !== "ergebnis") return sage(fehler);
    if (schritt.name === "termine_am_tag") {
      const { datum } = schritt.ausgang.ergebnis as TermineAmTagErgebnis;
      return rufe("aufgaben_anzeigen", { faelligBis: datum });
    }

    const kalender = bisher.findLast((s) => s.name === "termine_am_tag");
    if (kalender?.ausgang.art !== "ergebnis") return sage(fehler);
    const { datum, termine } = kalender.ausgang
      .ergebnis as TermineAmTagErgebnis;
    const { aufgaben } = schritt.ausgang.ergebnis as AufgabenAnzeigenErgebnis;
    const heute = berlinDatum(jetzt);
    const istHeute = datum === heute;

    const kopf = `${verstehe(text, jetzt)?.gruss ? "Guten Morgen! " : ""}Dein Überblick für ${istHeute ? "heute, " : ""}${formatiereTag(datum)}:`;
    const terminTeil =
      termine.length === 0
        ? "Termine: keine."
        : `Termine (${termine.length}):\n${termine.map(terminZeile).join("\n")}`;
    const bis = istHeute ? "bis heute" : `bis ${formatiereTag(datum)}`;
    const aufgabenTeil =
      aufgaben.length === 0
        ? `Fällige Aufgaben ${bis}: keine.`
        : `Fällige Aufgaben ${bis} (${aufgaben.length}):\n${aufgaben
            .map((a) => `• ${a.titel} – ${fristBeschreibung(a, heute)}`)
            .join("\n")}`;
    return sage(`${kopf}\n\n${terminTeil}\n\n${aufgabenTeil}`);
  },
};
