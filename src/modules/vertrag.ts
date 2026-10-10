import type { z } from "zod";

/**
 * Der Modul-Vertrag (CLAUDE.md, docs/architektur.md Abschnitt 4):
 * So sieht jedes Modul aus, das Jarvis über die Registry kennt.
 */

/** Was ein Werkzeug beim Ausführen über die Umgebung erfährt. */
export type WerkzeugKontext = {
  /** Für wen das Werkzeug arbeitet. Im Demo-Modus eine zufällige Sitzungs-ID, später die Nutzer-ID aus dem Login. */
  nutzerId: string;
  /** Aktueller Zeitpunkt. Kommt von außen, damit Tests mit festen Daten arbeiten können. */
  jetzt: Date;
};

/** Inhalt der Freigabe-Karte: was passiert und mit welchen Daten. */
export type ActionPreview = {
  titel: string;
  beschreibung: string;
  daten: { label: string; wert: string }[];
};

type ToolBasis<S extends z.ZodType> = {
  /** Erklärt dem Gehirn, wofür das Werkzeug da ist. */
  description: string;
  /** Erlaubte Eingabe; wird vor jeder Ausführung geprüft. */
  input: S;
  // Methoden-Schreibweise statt Pfeilfunktion: Nur so lassen sich Werkzeuge mit
  // unterschiedlichen Eingaben in einer gemeinsamen Liste sammeln.
  execute(input: z.output<S>, ctx: WerkzeugKontext): Promise<unknown>;
};

export type ReadTool<S extends z.ZodType = z.ZodType> = ToolBasis<S> & {
  effect: "read";
};

/** Schreib-Werkzeuge laufen nie direkt, sondern immer über die Schutzschicht. */
export type WriteTool<S extends z.ZodType = z.ZodType> = ToolBasis<S> & {
  effect: "write";
  preview(input: z.output<S>, ctx: WerkzeugKontext): Promise<ActionPreview>;
};

export type ModuleTool<S extends z.ZodType = z.ZodType> =
  ReadTool<S> | WriteTool<S>;

export type JarvisModule = {
  id: string;
  name: string;
  /** Kurzbeschreibung für das Gehirn (später: Systemprompt) */
  description: string;
  /** Google-Berechtigungen, so wenige wie möglich */
  googleScopes?: string[];
  tools: Record<string, ModuleTool>;
};
