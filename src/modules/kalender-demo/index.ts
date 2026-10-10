import { z } from "zod";
import { berlinDatum, formatiereTag, formatiereUhrzeit } from "@/lib/zeit";
import type { JarvisModule, ReadTool, WriteTool } from "../vertrag";
import { MAX_TERMINE, termineVon, type Termin } from "./termine";

const termineAmTagEingabe = z.object({
  /** Kalendertag „JJJJ-MM-TT“; ohne Angabe gilt heute. */
  tag: z.iso.date().optional(),
});

const termineAmTag: ReadTool<typeof termineAmTagEingabe> = {
  description:
    "Liefert die Termine eines Tages aus dem Demo-Kalender. Ohne Tag: heute.",
  effect: "read",
  input: termineAmTagEingabe,
  async execute({ tag }, ctx) {
    const datum = tag ?? berlinDatum(ctx.jetzt);
    const termine = termineVon(ctx.nutzerId, ctx.jetzt)
      .filter((t) => berlinDatum(new Date(t.beginn)) === datum)
      .sort((a, b) => a.beginn.localeCompare(b.beginn));
    return { datum, termine } satisfies TermineAmTagErgebnis;
  },
};

export type TermineAmTagErgebnis = { datum: string; termine: Termin[] };

const terminAnlegenEingabe = z.object({
  titel: z.string().trim().min(1).max(100),
  beginn: z.iso.datetime({ offset: true }),
  dauerMinuten: z
    .number()
    .int()
    .min(5)
    .max(24 * 60)
    .default(60),
});

function wannText(beginn: string) {
  const zeitpunkt = new Date(beginn);
  return `${formatiereTag(berlinDatum(zeitpunkt))}, ${formatiereUhrzeit(zeitpunkt)} Uhr`;
}

const terminAnlegen: WriteTool<typeof terminAnlegenEingabe> = {
  description: "Legt einen neuen Termin im Demo-Kalender an.",
  effect: "write",
  input: terminAnlegenEingabe,
  async preview({ titel, beginn, dauerMinuten }) {
    return {
      titel: "Termin anlegen",
      beschreibung: "Jarvis trägt diesen Termin in deinen Demo-Kalender ein.",
      daten: [
        { label: "Was", wert: titel },
        { label: "Wann", wert: wannText(beginn) },
        { label: "Dauer", wert: `${dauerMinuten} Minuten` },
        { label: "Kalender", wert: "Demo-Kalender (nur im Arbeitsspeicher)" },
      ],
    };
  },
  async execute({ titel, beginn, dauerMinuten }, ctx) {
    const termine = termineVon(ctx.nutzerId, ctx.jetzt);
    if (termine.length >= MAX_TERMINE) {
      throw new Error("Der Demo-Kalender ist voll.");
    }
    const start = new Date(beginn);
    const termin: Termin = {
      id: crypto.randomUUID(),
      titel,
      beginn: start.toISOString(),
      ende: new Date(start.getTime() + dauerMinuten * 60_000).toISOString(),
      demo: true,
    };
    termine.push(termin);
    return { termin } satisfies TerminAnlegenErgebnis;
  },
};

export type TerminAnlegenErgebnis = { termin: Termin };

/** Beispiel-Modul mit erfundenen Terminen. Wird im Anschluss-Block durch den echten Google-Kalender ersetzt. */
export const kalenderDemo: JarvisModule = {
  id: "kalender-demo",
  name: "Kalender (Demo)",
  description:
    "Demo-Kalender mit erfundenen Terminen. Liegt nur im Arbeitsspeicher.",
  googleScopes: [],
  tools: {
    termine_am_tag: termineAmTag,
    termin_anlegen: terminAnlegen,
  },
};
