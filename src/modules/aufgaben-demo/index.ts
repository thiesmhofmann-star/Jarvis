import { z } from "zod";
import { berlinDatum, formatiereTag } from "@/lib/zeit";
import type { JarvisModule, ReadTool, WriteTool } from "../vertrag";
import { MAX_AUFGABEN, aufgabenVon, type Aufgabe } from "./aufgaben";

const LISTE = "Demo-Aufgaben, nur im Arbeitsspeicher";

/** Aufgabe, wie sie das Gehirn sieht: mit dem Hinweis, ob sie überfällig ist. */
export type AufgabeAnsicht = Aufgabe & { ueberfaellig: boolean };

export type AufgabenAnzeigenErgebnis = {
  /** Gesetzt, wenn nur Aufgaben bis zu diesem Tag gefragt waren */
  faelligBis: string | null;
  aufgaben: AufgabeAnsicht[];
};
export type AufgabeErgebnis = { aufgabe: Aufgabe };

/** Sortiert nach Frist; Aufgaben ohne Frist kommen ans Ende. */
function nachFrist(a: Aufgabe, b: Aufgabe) {
  return (a.frist ?? "9999-12-31").localeCompare(b.frist ?? "9999-12-31");
}

const aufgabenAnzeigenEingabe = z.object({
  /** Nur Aufgaben mit Frist bis einschließlich dieses Tages („JJJJ-MM-TT“) */
  faelligBis: z.iso.date().optional(),
});

const aufgabenAnzeigen: ReadTool<typeof aufgabenAnzeigenEingabe> = {
  description:
    "Liefert die offenen Demo-Aufgaben, sortiert nach Frist. Mit faelligBis nur die, deren Frist bis zu diesem Tag reicht; Überfälliges steht dann oben.",
  effect: "read",
  input: aufgabenAnzeigenEingabe,
  async execute({ faelligBis }, ctx) {
    const heute = berlinDatum(ctx.jetzt);
    const aufgaben = aufgabenVon(ctx.nutzerId, ctx.jetzt)
      .filter((a) => !a.erledigt)
      .filter(
        (a) => !faelligBis || (a.frist !== undefined && a.frist <= faelligBis),
      )
      .sort(nachFrist)
      .map((a) => ({
        ...a,
        ueberfaellig: a.frist !== undefined && a.frist < heute,
      }));
    return {
      faelligBis: faelligBis ?? null,
      aufgaben,
    } satisfies AufgabenAnzeigenErgebnis;
  },
};

function fristText(frist?: string) {
  return frist ? formatiereTag(frist) : "keine";
}

const aufgabeAnlegenEingabe = z.object({
  titel: z.string().trim().min(1).max(100),
  frist: z.iso.date().optional(),
});

const aufgabeAnlegen: WriteTool<typeof aufgabeAnlegenEingabe> = {
  description: "Legt eine neue Aufgabe mit optionaler Frist an.",
  effect: "write",
  input: aufgabeAnlegenEingabe,
  async preview({ titel, frist }) {
    return {
      titel: "Aufgabe anlegen",
      beschreibung: "Jarvis setzt diese Aufgabe auf deine Demo-Aufgabenliste.",
      daten: [
        { label: "Was", wert: titel },
        { label: "Frist", wert: fristText(frist) },
        { label: "Liste", wert: LISTE },
      ],
    };
  },
  async execute({ titel, frist }, ctx) {
    const aufgaben = aufgabenVon(ctx.nutzerId, ctx.jetzt);
    if (aufgaben.length >= MAX_AUFGABEN) {
      throw new Error("Die Demo-Aufgabenliste ist voll.");
    }
    const aufgabe: Aufgabe = {
      id: crypto.randomUUID(),
      titel,
      ...(frist ? { frist } : {}),
      erledigt: false,
      demo: true,
    };
    aufgaben.push(aufgabe);
    return { aufgabe } satisfies AufgabeErgebnis;
  },
};

/** Sucht eine offene Aufgabe; sonst eine verständliche Fehlermeldung. */
function offeneAufgabe(nutzerId: string, jetzt: Date, id: string): Aufgabe {
  const aufgabe = aufgabenVon(nutzerId, jetzt).find((a) => a.id === id);
  if (!aufgabe) throw new Error("Diese Aufgabe gibt es nicht.");
  if (aufgabe.erledigt) {
    throw new Error(`„${aufgabe.titel}“ ist schon erledigt.`);
  }
  return aufgabe;
}

const aufgabeErledigenEingabe = z.object({ id: z.string().min(1) });

const aufgabeErledigen: WriteTool<typeof aufgabeErledigenEingabe> = {
  description:
    "Hakt eine offene Aufgabe über ihre ID ab. Die ID kommt aus aufgaben_anzeigen.",
  effect: "write",
  input: aufgabeErledigenEingabe,
  // Die Vorschau zeigt genau die Aufgabe, die danach abgehakt wird.
  async preview({ id }, ctx) {
    const aufgabe = offeneAufgabe(ctx.nutzerId, ctx.jetzt, id);
    return {
      titel: "Aufgabe abhaken",
      beschreibung:
        "Jarvis hakt diese Aufgabe auf deiner Demo-Aufgabenliste ab.",
      daten: [
        { label: "Was", wert: aufgabe.titel },
        { label: "Frist", wert: fristText(aufgabe.frist) },
        { label: "Liste", wert: LISTE },
      ],
    };
  },
  async execute({ id }, ctx) {
    // Erneut prüfen: Zwischen Vorschau und Freigabe kann sich etwas geändert haben.
    const aufgabe = offeneAufgabe(ctx.nutzerId, ctx.jetzt, id);
    aufgabe.erledigt = true;
    return { aufgabe } satisfies AufgabeErgebnis;
  },
};

/** Beispiel-Modul mit erfundenen Aufgaben. Wird im Anschluss-Block durch To-dos & Fristen mit Datenbank ersetzt. */
export const aufgabenDemo: JarvisModule = {
  id: "aufgaben-demo",
  name: "Aufgaben & Fristen (Demo)",
  description:
    "Demo-Aufgabenliste mit Fristen und erfundenen Aufgaben. Liegt nur im Arbeitsspeicher.",
  googleScopes: [],
  tools: {
    aufgaben_anzeigen: aufgabenAnzeigen,
    aufgabe_anlegen: aufgabeAnlegen,
    aufgabe_erledigen: aufgabeErledigen,
  },
};
