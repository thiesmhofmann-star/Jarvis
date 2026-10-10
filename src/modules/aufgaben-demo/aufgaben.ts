import { sitzungsSpeicher } from "@/lib/sitzungs-speicher";
import { berlinDatum, tagePlus } from "@/lib/zeit";

/** Eine Aufgabe in der Demo-Liste. Alles erfunden, nichts davon ist echt. */
export type Aufgabe = {
  id: string;
  titel: string;
  /** Kalendertag „JJJJ-MM-TT“, keine Uhrzeit */
  frist?: string;
  erledigt: boolean;
  demo: true;
};

/** Erfundene Aufgaben für den Tag, an dem eine Sitzung beginnt. */
function beispielaufgaben(jetzt: Date): Aufgabe[] {
  const heute = berlinDatum(jetzt);
  const aufgabe = (titel: string, frist?: string): Aufgabe => ({
    id: crypto.randomUUID(),
    titel,
    ...(frist ? { frist } : {}),
    erledigt: false,
    demo: true,
  });
  return [
    aufgabe("Bibliotheksbuch zurückgeben", tagePlus(heute, -2)),
    aufgabe("Paket zur Post bringen", heute),
    aufgabe("Wasserfilter wechseln", tagePlus(heute, 3)),
    aufgabe("Urlaubsfotos sortieren"),
  ];
}

// Jede Sitzung bekommt ihre eigene Demo-Liste im Arbeitsspeicher.
// Sie verschwindet mit der Sitzung; nichts wird dauerhaft gespeichert.
const listen = sitzungsSpeicher(() => ({
  aufgaben: [] as Aufgabe[],
  befuellt: false,
}));

export function aufgabenVon(nutzerId: string, jetzt: Date): Aufgabe[] {
  const eintrag = listen.hole(nutzerId);
  if (!eintrag.befuellt) {
    eintrag.aufgaben.push(...beispielaufgaben(jetzt));
    eintrag.befuellt = true;
  }
  return eintrag.aufgaben;
}

/** Obergrenze, damit niemand den Speicher der öffentlichen Demo füllen kann. */
export const MAX_AUFGABEN = 50;
