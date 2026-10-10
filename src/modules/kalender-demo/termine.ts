import { sitzungsSpeicher } from "@/lib/sitzungs-speicher";
import { berlinDatum, berlinZeitpunkt } from "@/lib/zeit";

/** Ein Termin im Demo-Kalender. Alles erfunden, nichts davon ist echt. */
export type Termin = {
  id: string;
  titel: string;
  beginn: string; // ISO-Zeitpunkt
  ende: string; // ISO-Zeitpunkt
  demo: true;
};

/** Erfundene Termine für den Tag, an dem eine Sitzung beginnt. */
function beispieltermine(jetzt: Date): Termin[] {
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
  return [
    termin("Team-Besprechung", [9, 0], [9, 30]),
    termin("Mittagspause", [12, 30], [13, 30]),
    termin("Laufen im Park", [18, 0], [19, 0]),
  ];
}

// Jede Sitzung bekommt ihren eigenen Demo-Kalender im Arbeitsspeicher.
// Er verschwindet mit der Sitzung; nichts wird dauerhaft gespeichert.
const kalender = sitzungsSpeicher(() => ({
  termine: [] as Termin[],
  befuellt: false,
}));

export function termineVon(nutzerId: string, jetzt: Date): Termin[] {
  const eintrag = kalender.hole(nutzerId);
  if (!eintrag.befuellt) {
    eintrag.termine.push(...beispieltermine(jetzt));
    eintrag.befuellt = true;
  }
  return eintrag.termine;
}

/** Obergrenze, damit niemand den Speicher der öffentlichen Demo füllen kann. */
export const MAX_TERMINE = 50;
