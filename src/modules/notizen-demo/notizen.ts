import { sitzungsSpeicher } from "@/lib/sitzungs-speicher";

/** Eine Notiz. Alles erfunden, nichts davon ist echt. */
export type Notiz = {
  id: string;
  text: string;
  erstellt: string; // ISO-Zeitpunkt
  demo: true;
};

/** Erfundene Notizen für den Start einer Sitzung. */
function beispielnotizen(jetzt: Date): Notiz[] {
  return [
    "Geschenkidee für Mama: Kochbuch mit Pasta-Rezepten",
    "Idee: Kräuter auf dem Balkon pflanzen",
  ].map((text) => ({
    id: crypto.randomUUID(),
    text,
    erstellt: jetzt.toISOString(),
    demo: true,
  }));
}

// Jede Sitzung bekommt ihre eigenen Demo-Notizen im Arbeitsspeicher.
// Sie verschwinden mit der Sitzung; nichts wird dauerhaft gespeichert.
const ablagen = sitzungsSpeicher(() => ({
  notizen: [] as Notiz[],
  befuellt: false,
}));

export function notizenVon(nutzerId: string, jetzt: Date): Notiz[] {
  const eintrag = ablagen.hole(nutzerId);
  if (!eintrag.befuellt) {
    eintrag.notizen.push(...beispielnotizen(jetzt));
    eintrag.befuellt = true;
  }
  return eintrag.notizen;
}

/** Obergrenzen, damit niemand den Speicher der öffentlichen Demo füllen kann. */
export const MAX_NOTIZEN = 50;
export const MAX_NOTIZ_LAENGE = 500;
