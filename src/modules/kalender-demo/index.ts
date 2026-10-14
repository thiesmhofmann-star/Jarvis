import { z } from "zod";
import { berlinDatum, formatiereWochentag, tagePlus } from "@/lib/zeit";
import type { JarvisModule, ReadTool, WriteTool } from "../vertrag";
import { pflegeWerkzeuge } from "./pflegen";
import { neueSerie, vorkommen, vorkommenZwischen } from "./serien";
import {
  eintraegeZwischen,
  kalenderVon,
  pruefePlatz,
  type Termin,
  type TerminAnsicht,
} from "./termine";
import { KALENDER, wannText } from "./texte";

export type { TerminAnsicht, Umfang } from "./termine";
export type { TerminAbsagenErgebnis, TerminAendernErgebnis } from "./pflegen";

// ---------- Lesen ----------

const termineAmTagEingabe = z.object({
  /** Kalendertag „JJJJ-MM-TT“; ohne Angabe gilt heute. */
  tag: z.iso.date().optional(),
});

const termineAmTag: ReadTool<typeof termineAmTagEingabe> = {
  description:
    "Liefert die Termine eines Tages aus dem Demo-Kalender, auch Vorkommen von Dauerterminen. Ohne Tag: heute.",
  effect: "read",
  input: termineAmTagEingabe,
  async execute({ tag }, ctx) {
    const datum = tag ?? berlinDatum(ctx.jetzt);
    const termine = eintraegeZwischen(
      kalenderVon(ctx.nutzerId, ctx.jetzt),
      datum,
      datum,
    );
    return { datum, termine } satisfies TermineAmTagErgebnis;
  },
};

export type TermineAmTagErgebnis = { datum: string; termine: TerminAnsicht[] };

const termineSuchenEingabe = z.object({
  /** Wörter, die alle im Titel vorkommen müssen; Groß- und Kleinschreibung egal */
  text: z.string().trim().min(1).max(100),
  /** Erster Tag („JJJJ-MM-TT“); ohne Angabe heute */
  von: z.iso.date().optional(),
  /** Letzter Tag; ohne Angabe 30 Tage nach dem ersten */
  bis: z.iso.date().optional(),
});

/** So viele Tage durchsucht termine_suchen höchstens auf einmal. */
const MAX_SUCHTAGE = 366;

const termineSuchen: ReadTool<typeof termineSuchenEingabe> = {
  description:
    "Sucht Termine im Demo-Kalender, deren Titel alle Wörter aus text enthält. Ohne Zeitraum: heute und die nächsten 30 Tage. Dauertermine erscheinen mit jedem Vorkommen.",
  effect: "read",
  input: termineSuchenEingabe,
  async execute({ text, von, bis }, ctx) {
    const start = von ?? berlinDatum(ctx.jetzt);
    const ende = bis ?? tagePlus(start, 30);
    if (ende < start) {
      throw new Error("Der Zeitraum endet, bevor er anfängt.");
    }
    if (ende > tagePlus(start, MAX_SUCHTAGE)) {
      throw new Error("Ich suche höchstens ein Jahr auf einmal.");
    }
    const woerter = text.toLowerCase().split(/\s+/);
    const termine = eintraegeZwischen(
      kalenderVon(ctx.nutzerId, ctx.jetzt),
      start,
      ende,
    ).filter((t) => woerter.every((w) => t.titel.toLowerCase().includes(w)));
    return {
      text,
      von: start,
      bis: ende,
      termine,
    } satisfies TermineSuchenErgebnis;
  },
};

export type TermineSuchenErgebnis = {
  text: string;
  von: string;
  bis: string;
  termine: TerminAnsicht[];
};

/** Ein Dauertermin mit seinem Rhythmus und dem nächsten Vorkommen ab heute */
export type DauerterminAnsicht = {
  id: string;
  titel: string;
  /** Wochentag des Rhythmus, z. B. „Samstag“ */
  wochentag: string;
  /** Beginn im Rhythmus, z. B. „20:00“ (Berliner Zeit) */
  uhrzeit: string;
  dauerMinuten: number;
  /** Nächstes Vorkommen ab heute (heute zählt mit) */
  naechstes: TerminAnsicht;
};

export type DauertermineAnzeigenErgebnis = {
  dauertermine: DauerterminAnsicht[];
};

const keineEingabe = z.object({});

const dauertermineAnzeigen: ReadTool<typeof keineEingabe> = {
  description:
    "Liefert alle Dauertermine mit Wochentag, Uhrzeit, Dauer und dem nächsten Vorkommen ab heute, nach dem nächsten Vorkommen sortiert. Beendete Dauertermine fehlen.",
  effect: "read",
  input: keineEingabe,
  async execute(_eingabe, ctx) {
    const heute = berlinDatum(ctx.jetzt);
    const dauertermine = kalenderVon(ctx.nutzerId, ctx.jetzt)
      .serien.flatMap((serie): DauerterminAnsicht[] => {
        const [naechstes] = vorkommenZwischen(
          serie,
          heute,
          tagePlus(heute, 366),
        ).sort((a, b) => a.beginn.localeCompare(b.beginn));
        if (!naechstes) return [];
        return [
          {
            id: serie.id,
            titel: serie.titel,
            wochentag: formatiereWochentag(serie.startTag),
            uhrzeit: `${String(serie.stunde).padStart(2, "0")}:${String(serie.minute).padStart(2, "0")}`,
            dauerMinuten: serie.dauerMinuten,
            naechstes,
          },
        ];
      })
      .sort((a, b) => a.naechstes.beginn.localeCompare(b.naechstes.beginn));
    return { dauertermine } satisfies DauertermineAnzeigenErgebnis;
  },
};

// ---------- Anlegen ----------

const terminAnlegenEingabe = z.object({
  titel: z.string().trim().min(1).max(100),
  beginn: z.iso.datetime({ offset: true }),
  dauerMinuten: z
    .number()
    .int()
    .min(5)
    .max(24 * 60)
    .default(60),
  /** true: jede Woche am selben Wochentag zur selben Uhrzeit, ohne Ende */
  woechentlich: z.boolean().default(false),
  /** Woher der Vorschlag kommt, z. B. eine Mail; steht auf der Freigabe-Karte */
  quelle: z.string().trim().min(1).max(200).optional(),
});

const terminAnlegen: WriteTool<typeof terminAnlegenEingabe> = {
  description:
    "Legt einen neuen Termin im Demo-Kalender an. Mit woechentlich: true als Dauertermin jede Woche am selben Wochentag zur selben Uhrzeit.",
  effect: "write",
  input: terminAnlegenEingabe,
  async preview({ titel, beginn, dauerMinuten, woechentlich, quelle }) {
    const herkunft = quelle ? [{ label: "Quelle", wert: quelle }] : [];
    if (!woechentlich) {
      return {
        titel: "Termin anlegen",
        beschreibung: "Jarvis trägt diesen Termin in deinen Demo-Kalender ein.",
        daten: [
          { label: "Was", wert: titel },
          { label: "Wann", wert: wannText(beginn) },
          { label: "Dauer", wert: `${dauerMinuten} Minuten` },
          ...herkunft,
          { label: "Kalender", wert: KALENDER },
        ],
      };
    }
    return {
      titel: "Dauertermin anlegen",
      beschreibung:
        "Jarvis trägt diesen Termin jede Woche in deinen Demo-Kalender ein.",
      daten: [
        { label: "Was", wert: titel },
        { label: "Wann", wert: `Ab ${wannText(beginn)}` },
        {
          label: "Wiederholung",
          wert: `Jede Woche am ${formatiereWochentag(berlinDatum(new Date(beginn)))}`,
        },
        { label: "Dauer", wert: `${dauerMinuten} Minuten` },
        ...herkunft,
        { label: "Kalender", wert: KALENDER },
      ],
    };
  },
  async execute({ titel, beginn, dauerMinuten, woechentlich }, ctx) {
    const kalender = kalenderVon(ctx.nutzerId, ctx.jetzt);
    pruefePlatz(kalender);
    const start = new Date(beginn);
    if (woechentlich) {
      const serie = neueSerie({ titel, beginn: start, dauerMinuten });
      kalender.serien.push(serie);
      return {
        termin: vorkommen(serie, serie.startTag),
      } satisfies TerminAnlegenErgebnis;
    }
    const termin: Termin = {
      id: crypto.randomUUID(),
      titel,
      beginn: start.toISOString(),
      ende: new Date(start.getTime() + dauerMinuten * 60_000).toISOString(),
      demo: true,
    };
    kalender.termine.push(termin);
    return { termin: { ...termin } } satisfies TerminAnlegenErgebnis;
  },
};

export type TerminAnlegenErgebnis = { termin: TerminAnsicht };

/** Beispiel-Modul mit erfundenen Terminen. Wird im Anschluss-Block durch den echten Google-Kalender ersetzt. */
export const kalenderDemo: JarvisModule = {
  id: "kalender-demo",
  name: "Kalender (Demo)",
  description:
    "Demo-Kalender mit erfundenen Terminen und Dauerterminen. Liegt nur im Arbeitsspeicher.",
  googleScopes: [],
  tools: {
    termine_am_tag: termineAmTag,
    termine_suchen: termineSuchen,
    dauertermine_anzeigen: dauertermineAnzeigen,
    termin_anlegen: terminAnlegen,
    ...pflegeWerkzeuge,
  },
};
