import { sitzungsSpeicher } from "@/lib/sitzungs-speicher";
import type { ActionPreview } from "@/modules/vertrag";

/** Lebenslauf einer Aktion, wie in der Tabelle pending_actions (docs/architektur.md, Abschnitt 7). */
export type AktionsStatus =
  "offen" | "freigegeben" | "abgelehnt" | "erledigt" | "fehlgeschlagen";

/** Eine Schreib-Aktion, die auf Thies' Entscheidung wartet oder gewartet hat. */
export type AusstehendeAktion = {
  id: string;
  nutzerId: string;
  modulId: string;
  werkzeug: string;
  eingabe: unknown;
  vorschau: ActionPreview;
  status: AktionsStatus;
  ergebnis?: unknown;
  fehler?: string;
  erstelltAm: Date;
  entschiedenAm?: Date;
};

/**
 * Ablage für ausstehende Aktionen. Im Demo-Modus im Arbeitsspeicher; im
 * Anschluss-Block kommt hier die Tabelle pending_actions dahinter.
 * Asynchron, weil eine Datenbank es auch ist.
 */
export interface AktionsSpeicher {
  anlegen(aktion: AusstehendeAktion): Promise<void>;
  /** Nur Aktionen des eigenen Nutzers sind sichtbar. */
  holen(nutzerId: string, id: string): Promise<AusstehendeAktion | undefined>;
  speichern(aktion: AusstehendeAktion): Promise<void>;
}

/** Höchstzahl gemerkter Aktionen je Sitzung; ältere fallen weg. */
const MAX_AKTIONEN = 50;

export function aktionenImArbeitsspeicher(): AktionsSpeicher {
  const sitzungen = sitzungsSpeicher(
    () => new Map<string, AusstehendeAktion>(),
  );
  return {
    async anlegen(aktion) {
      const aktionen = sitzungen.hole(aktion.nutzerId);
      aktionen.set(aktion.id, { ...aktion });
      if (aktionen.size > MAX_AKTIONEN) {
        const aelteste = aktionen.keys().next().value;
        if (aelteste !== undefined) aktionen.delete(aelteste);
      }
    },
    async holen(nutzerId, id) {
      const aktion = sitzungen.hole(nutzerId).get(id);
      return aktion && { ...aktion };
    },
    async speichern(aktion) {
      sitzungen.hole(aktion.nutzerId).set(aktion.id, { ...aktion });
    },
  };
}
