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
  /** Welche Aufgaben: offene (Standard), erledigte oder alle */
  status: AufgabenStatus;
  aufgaben: AufgabeAnsicht[];
};
export type AufgabenStatus = "offen" | "erledigt" | "alle";
export type AufgabeErgebnis = { aufgabe: Aufgabe };

/** Sortiert nach Frist; Aufgaben ohne Frist kommen ans Ende. */
function nachFrist(a: Aufgabe, b: Aufgabe) {
  return (a.frist ?? "9999-12-31").localeCompare(b.frist ?? "9999-12-31");
}

const aufgabenAnzeigenEingabe = z.object({
  /** Nur Aufgaben mit Frist bis einschließlich dieses Tages („JJJJ-MM-TT“) */
  faelligBis: z.iso.date().optional(),
  /** Offene (Standard), erledigte oder alle Aufgaben */
  status: z.enum(["offen", "erledigt", "alle"]).default("offen"),
});

const aufgabenAnzeigen: ReadTool<typeof aufgabenAnzeigenEingabe> = {
  description:
    "Liefert die offenen Demo-Aufgaben, sortiert nach Frist. Mit faelligBis nur die, deren Frist bis zu diesem Tag reicht; Überfälliges steht dann oben. Mit status auch erledigte oder alle.",
  effect: "read",
  input: aufgabenAnzeigenEingabe,
  async execute({ faelligBis, status }, ctx) {
    const heute = berlinDatum(ctx.jetzt);
    const aufgaben = aufgabenVon(ctx.nutzerId, ctx.jetzt)
      .filter(
        (a) => status === "alle" || a.erledigt === (status === "erledigt"),
      )
      .filter(
        (a) => !faelligBis || (a.frist !== undefined && a.frist <= faelligBis),
      )
      .sort(nachFrist)
      .map((a) => ({
        ...a,
        ueberfaellig: !a.erledigt && a.frist !== undefined && a.frist < heute,
      }));
    return {
      faelligBis: faelligBis ?? null,
      status,
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
    aufgabe.erledigtAm = ctx.jetzt.toISOString();
    return { aufgabe } satisfies AufgabeErgebnis;
  },
};

/** Sucht eine Aufgabe, offen oder erledigt; sonst eine verständliche Fehlermeldung. */
function irgendeineAufgabe(nutzerId: string, jetzt: Date, id: string): Aufgabe {
  const aufgabe = aufgabenVon(nutzerId, jetzt).find((a) => a.id === id);
  if (!aufgabe) throw new Error("Diese Aufgabe gibt es nicht.");
  return aufgabe;
}

/** „„Steuer“, Frist Freitag, 16. Oktober“ oder nur „Frist …“ / „ohne Frist“ */
function standText(
  titel: string,
  frist: string | undefined,
  mitTitel: boolean,
) {
  const fristTeil = frist ? `Frist ${formatiereTag(frist)}` : "ohne Frist";
  return mitTitel ? `„${titel}“, ${fristTeil}` : fristTeil;
}

const aufgabeAendernEingabe = z.object({
  id: z.string().min(1),
  /** Neuer Titel; ohne Angabe bleibt er */
  titel: z.string().trim().min(1).max(100).optional(),
  /** Neue Frist („JJJJ-MM-TT“); null entfernt die Frist; ohne Angabe bleibt sie */
  frist: z.iso.date().nullable().optional(),
});

/** Prüft die Änderung und rechnet den neuen Stand aus (Vorschau und Ausführen). */
function planeAenderung(
  { id, titel, frist }: z.output<typeof aufgabeAendernEingabe>,
  nutzerId: string,
  jetzt: Date,
) {
  const aufgabe = offeneAufgabe(nutzerId, jetzt, id);
  if (titel === undefined && frist === undefined) {
    throw new Error("Sag mir, was sich ändern soll: Titel oder Frist.");
  }
  const neu = {
    titel: titel ?? aufgabe.titel,
    frist: frist === undefined ? aufgabe.frist : (frist ?? undefined),
  };
  if (neu.titel === aufgabe.titel && neu.frist === aufgabe.frist) {
    throw new Error(`Bei „${aufgabe.titel}“ ändert sich damit nichts.`);
  }
  return { aufgabe, neu };
}

const aufgabeAendern: WriteTool<typeof aufgabeAendernEingabe> = {
  description:
    "Ändert Titel und/oder Frist einer offenen Aufgabe über ihre ID. frist: null entfernt die Frist.",
  effect: "write",
  input: aufgabeAendernEingabe,
  async preview(eingabe, ctx) {
    const { aufgabe, neu } = planeAenderung(eingabe, ctx.nutzerId, ctx.jetzt);
    const mitTitel = neu.titel !== aufgabe.titel;
    return {
      titel: "Aufgabe ändern",
      beschreibung:
        "Jarvis ändert diese Aufgabe auf deiner Demo-Aufgabenliste.",
      daten: [
        { label: "Was", wert: aufgabe.titel },
        {
          label: "Bisher",
          wert: standText(aufgabe.titel, aufgabe.frist, mitTitel),
        },
        { label: "Neu", wert: standText(neu.titel, neu.frist, mitTitel) },
        { label: "Liste", wert: LISTE },
      ],
    };
  },
  async execute(eingabe, ctx) {
    const { aufgabe, neu } = planeAenderung(eingabe, ctx.nutzerId, ctx.jetzt);
    aufgabe.titel = neu.titel;
    if (neu.frist) aufgabe.frist = neu.frist;
    else delete aufgabe.frist;
    return { aufgabe: { ...aufgabe } } satisfies AufgabeErgebnis;
  },
};

const idEingabe = z.object({ id: z.string().min(1) });

const aufgabeLoeschen: WriteTool<typeof idEingabe> = {
  description:
    "Entfernt eine Aufgabe (offen oder erledigt) über ihre ID von der Liste.",
  effect: "write",
  input: idEingabe,
  async preview({ id }, ctx) {
    const aufgabe = irgendeineAufgabe(ctx.nutzerId, ctx.jetzt, id);
    return {
      titel: "Aufgabe löschen",
      beschreibung:
        "Jarvis entfernt diese Aufgabe von deiner Demo-Aufgabenliste.",
      daten: [
        { label: "Was", wert: aufgabe.titel },
        { label: "Frist", wert: fristText(aufgabe.frist) },
        { label: "Stand", wert: aufgabe.erledigt ? "erledigt" : "offen" },
        { label: "Liste", wert: LISTE },
      ],
    };
  },
  async execute({ id }, ctx) {
    const aufgaben = aufgabenVon(ctx.nutzerId, ctx.jetzt);
    const aufgabe = irgendeineAufgabe(ctx.nutzerId, ctx.jetzt, id);
    aufgaben.splice(aufgaben.indexOf(aufgabe), 1);
    return { aufgabe } satisfies AufgabeErgebnis;
  },
};

/** Sucht eine erledigte Aufgabe; sonst eine verständliche Fehlermeldung. */
function erledigteAufgabe(nutzerId: string, jetzt: Date, id: string) {
  const aufgabe = irgendeineAufgabe(nutzerId, jetzt, id);
  if (!aufgabe.erledigt) {
    throw new Error(`„${aufgabe.titel}“ ist noch offen.`);
  }
  return aufgabe;
}

const aufgabeWiederOeffnen: WriteTool<typeof idEingabe> = {
  description:
    "Setzt eine erledigte Aufgabe über ihre ID wieder auf offen. Die ID kommt aus aufgaben_anzeigen mit status erledigt.",
  effect: "write",
  input: idEingabe,
  async preview({ id }, ctx) {
    const aufgabe = erledigteAufgabe(ctx.nutzerId, ctx.jetzt, id);
    return {
      titel: "Aufgabe wieder öffnen",
      beschreibung:
        "Jarvis setzt diese Aufgabe auf deiner Demo-Aufgabenliste wieder auf offen.",
      daten: [
        { label: "Was", wert: aufgabe.titel },
        { label: "Frist", wert: fristText(aufgabe.frist) },
        { label: "Liste", wert: LISTE },
      ],
    };
  },
  async execute({ id }, ctx) {
    const aufgabe = erledigteAufgabe(ctx.nutzerId, ctx.jetzt, id);
    aufgabe.erledigt = false;
    delete aufgabe.erledigtAm;
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
    aufgabe_aendern: aufgabeAendern,
    aufgabe_loeschen: aufgabeLoeschen,
    aufgabe_wieder_oeffnen: aufgabeWiederOeffnen,
  },
};
