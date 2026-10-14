import { z } from "zod";
import type { JarvisModule, ReadTool, WriteTool } from "../vertrag";
import {
  MAX_NOTIZEN,
  MAX_NOTIZ_LAENGE,
  notizenVon,
  type Notiz,
} from "./notizen";

export type { Notiz } from "./notizen";

const ABLAGE = "Demo-Notizen (nur im Arbeitsspeicher)";

export type NotizenAnzeigenErgebnis = {
  suche: string | null;
  notizen: Notiz[];
};
export type NotizErgebnis = { notiz: Notiz };

const notizenAnzeigenEingabe = z.object({
  /** Wörter, die alle in der Notiz vorkommen müssen */
  suche: z.string().trim().min(1).max(100).optional(),
});

const notizenAnzeigen: ReadTool<typeof notizenAnzeigenEingabe> = {
  description:
    "Liefert die Demo-Notizen, neueste zuerst. Mit suche nur die, die alle Wörter enthalten.",
  effect: "read",
  input: notizenAnzeigenEingabe,
  async execute({ suche }, ctx) {
    const woerter = suche?.toLowerCase().split(/\s+/) ?? [];
    const notizen = notizenVon(ctx.nutzerId, ctx.jetzt)
      .filter((n) => woerter.every((w) => n.text.toLowerCase().includes(w)))
      .reverse();
    return { suche: suche ?? null, notizen } satisfies NotizenAnzeigenErgebnis;
  },
};

const notizAnlegenEingabe = z.object({
  text: z.string().trim().min(1).max(MAX_NOTIZ_LAENGE),
});

const notizAnlegen: WriteTool<typeof notizAnlegenEingabe> = {
  description: "Legt eine neue Notiz an.",
  effect: "write",
  input: notizAnlegenEingabe,
  async preview({ text }) {
    return {
      titel: "Notiz anlegen",
      beschreibung: "Jarvis legt diese Notiz in deinen Demo-Notizen ab.",
      daten: [
        { label: "Notiz", wert: text },
        { label: "Ablage", wert: ABLAGE },
      ],
    };
  },
  async execute({ text }, ctx) {
    const notizen = notizenVon(ctx.nutzerId, ctx.jetzt);
    if (notizen.length >= MAX_NOTIZEN) {
      throw new Error("Die Demo-Notizen sind voll.");
    }
    const notiz: Notiz = {
      id: crypto.randomUUID(),
      text,
      erstellt: ctx.jetzt.toISOString(),
      demo: true,
    };
    notizen.push(notiz);
    return { notiz } satisfies NotizErgebnis;
  },
};

function notizMitId(nutzerId: string, jetzt: Date, id: string) {
  const notiz = notizenVon(nutzerId, jetzt).find((n) => n.id === id);
  if (!notiz) throw new Error("Diese Notiz gibt es nicht.");
  return notiz;
}

const notizLoeschenEingabe = z.object({ id: z.string().min(1) });

const notizLoeschen: WriteTool<typeof notizLoeschenEingabe> = {
  description:
    "Löscht eine Notiz über ihre ID. Die ID kommt aus notizen_anzeigen.",
  effect: "write",
  input: notizLoeschenEingabe,
  async preview({ id }, ctx) {
    const notiz = notizMitId(ctx.nutzerId, ctx.jetzt, id);
    return {
      titel: "Notiz löschen",
      beschreibung: "Jarvis entfernt diese Notiz aus deinen Demo-Notizen.",
      daten: [
        { label: "Notiz", wert: notiz.text },
        { label: "Ablage", wert: ABLAGE },
      ],
    };
  },
  async execute({ id }, ctx) {
    const notizen = notizenVon(ctx.nutzerId, ctx.jetzt);
    const notiz = notizMitId(ctx.nutzerId, ctx.jetzt, id);
    notizen.splice(notizen.indexOf(notiz), 1);
    return { notiz } satisfies NotizErgebnis;
  },
};

/** Beispiel-Modul mit erfundenen Notizen. Im Anschluss-Block mit Datenbank. */
export const notizenDemo: JarvisModule = {
  id: "notizen-demo",
  name: "Notizen (Demo)",
  description:
    "Demo-Notizen für Ideen und Merkzettel. Liegen nur im Arbeitsspeicher.",
  googleScopes: [],
  tools: {
    notizen_anzeigen: notizenAnzeigen,
    notiz_anlegen: notizAnlegen,
    notiz_loeschen: notizLoeschen,
  },
};
