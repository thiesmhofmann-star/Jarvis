import { sitzungsSpeicher } from "@/lib/sitzungs-speicher";
import type { Nachricht } from "./gehirn";

/**
 * Ablage für den Gesprächsverlauf. Im Demo-Modus im Arbeitsspeicher; im
 * Anschluss-Block kommen hier die Tabellen conversations und messages dahinter.
 */
export interface GespraechsSpeicher {
  verlauf(nutzerId: string): Promise<readonly Nachricht[]>;
  anhaengen(nutzerId: string, nachricht: Nachricht): Promise<void>;
}

/** Ältere Nachrichten fallen weg, damit der Speicher klein bleibt. */
const MAX_NACHRICHTEN = 100;

export function gespraecheImArbeitsspeicher(): GespraechsSpeicher {
  const sitzungen = sitzungsSpeicher(() => [] as Nachricht[]);
  return {
    async verlauf(nutzerId) {
      return [...sitzungen.hole(nutzerId)];
    },
    async anhaengen(nutzerId, nachricht) {
      const verlauf = sitzungen.hole(nutzerId);
      verlauf.push(nachricht);
      if (verlauf.length > MAX_NACHRICHTEN) verlauf.shift();
    },
  };
}
