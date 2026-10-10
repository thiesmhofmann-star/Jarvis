import type { z } from "zod";

/**
 * Die Gehirn-Schnittstelle: Hier wird im Anschluss-Block das Demo-Gehirn
 * gegen Claude getauscht. Alles andere (Chat-Ablauf, Schutzschicht, Module,
 * Oberfläche) bleibt dabei unverändert.
 */

/** Wie ein Werkzeug-Aufruf ausgegangen ist. */
export type WerkzeugAusgang =
  | { art: "ergebnis"; ergebnis: unknown }
  | { art: "abgelehnt" }
  | { art: "fehler"; meldung: string };

/** Ein Eintrag im Gesprächsverlauf. */
export type Nachricht =
  | { rolle: "nutzer"; text: string }
  | { rolle: "jarvis"; text: string }
  | {
      rolle: "werkzeug";
      name: string;
      eingabe: unknown;
      ausgang: WerkzeugAusgang;
    };

/** Was das Gehirn über ein verfügbares Werkzeug erfährt. */
export type WerkzeugAngebot = {
  name: string;
  beschreibung: string;
  effekt: "read" | "write";
  /** Erlaubte Eingabe. Claude bekommt sie später als JSON-Schema. */
  eingabe: z.ZodType;
};

export type GehirnAnfrage = {
  verlauf: readonly Nachricht[];
  werkzeuge: readonly WerkzeugAngebot[];
  /** Aktueller Zeitpunkt, damit „heute“ und „Freitag“ eindeutig sind */
  jetzt: Date;
};

/** Das Gehirn antwortet mit Text oder bittet darum, ein Werkzeug aufzurufen. */
export type GehirnAntwort =
  | { art: "text"; text: string }
  | { art: "werkzeug"; name: string; eingabe: unknown };

export interface Gehirn {
  antworte(anfrage: GehirnAnfrage): Promise<GehirnAntwort>;
}
