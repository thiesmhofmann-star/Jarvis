import { z } from "zod";
import type { JarvisModule, ReadTool, WriteTool } from "../vertrag";
import {
  MAX_ENTWUERFE,
  posteingangVon,
  type Entwurf,
  type Mail,
} from "./mails";

export type { Entwurf, Mail } from "./mails";

const POSTEINGANG = "Demo-Posteingang (nur im Arbeitsspeicher)";

/** Mail in der Liste: ohne vollen Text, mit Anfang als Vorschau */
export type MailKurz = Omit<Mail, "text"> & { vorschau: string };

export type MailsAnzeigenErgebnis = {
  suche: string | null;
  mails: MailKurz[];
};
export type MailLesenErgebnis = { mail: Mail };
export type EntwurfErgebnis = { entwurf: Entwurf };
export type EntwuerfeAnzeigenErgebnis = { entwuerfe: Entwurf[] };

const mailsAnzeigenEingabe = z.object({
  /** Wörter, die alle im Absender oder Betreff vorkommen müssen */
  suche: z.string().trim().min(1).max(100).optional(),
});

const mailsAnzeigen: ReadTool<typeof mailsAnzeigenEingabe> = {
  description:
    "Liefert die Mails im Demo-Posteingang, neueste zuerst, mit Absender, Betreff und Anfang des Textes. Mit suche nur die, deren Absender oder Betreff alle Wörter enthält.",
  effect: "read",
  input: mailsAnzeigenEingabe,
  async execute({ suche }, ctx) {
    const woerter = suche?.toLowerCase().split(/\s+/) ?? [];
    const mails = posteingangVon(ctx.nutzerId, ctx.jetzt)
      .mails.filter((m) => {
        const wo = `${m.von} ${m.adresse} ${m.betreff}`.toLowerCase();
        return woerter.every((w) => wo.includes(w));
      })
      .sort((a, b) => b.empfangen.localeCompare(a.empfangen))
      .map(({ text, ...rest }) => ({
        ...rest,
        vorschau: text.length > 80 ? `${text.slice(0, 79)}…` : text,
      }));
    return { suche: suche ?? null, mails } satisfies MailsAnzeigenErgebnis;
  },
};

function mailMitId(nutzerId: string, jetzt: Date, id: string) {
  const mail = posteingangVon(nutzerId, jetzt).mails.find((m) => m.id === id);
  if (!mail) throw new Error("Diese Mail gibt es nicht im Demo-Posteingang.");
  return mail;
}

const mailLesenEingabe = z.object({ id: z.string().min(1) });

const mailLesen: ReadTool<typeof mailLesenEingabe> = {
  description: "Liefert eine Mail mit vollem Text über ihre ID.",
  effect: "read",
  input: mailLesenEingabe,
  async execute({ id }, ctx) {
    return {
      mail: mailMitId(ctx.nutzerId, ctx.jetzt, id),
    } satisfies MailLesenErgebnis;
  },
};

const entwurfEingabe = z.object({
  /** Die Mail, auf die geantwortet wird */
  mailId: z.string().min(1),
  text: z.string().trim().min(1).max(2000),
});

const antwortEntwurfAnlegen: WriteTool<typeof entwurfEingabe> = {
  description:
    "Legt einen Antwort-Entwurf zu einer Mail ab. Gesendet wird nichts; ein Senden-Werkzeug gibt es nicht.",
  effect: "write",
  input: entwurfEingabe,
  async preview({ mailId, text }, ctx) {
    const mail = mailMitId(ctx.nutzerId, ctx.jetzt, mailId);
    return {
      titel: "Antwort-Entwurf speichern",
      beschreibung:
        "Jarvis legt diesen Entwurf im Demo-Posteingang ab. Gesendet wird nichts.",
      daten: [
        { label: "An", wert: mail.von },
        { label: "Betreff", wert: `Re: ${mail.betreff}` },
        { label: "Text", wert: text },
        { label: "Posteingang", wert: POSTEINGANG },
      ],
    };
  },
  async execute({ mailId, text }, ctx) {
    const posteingang = posteingangVon(ctx.nutzerId, ctx.jetzt);
    const mail = mailMitId(ctx.nutzerId, ctx.jetzt, mailId);
    if (posteingang.entwuerfe.length >= MAX_ENTWUERFE) {
      throw new Error("Im Demo-Posteingang liegen schon zu viele Entwürfe.");
    }
    const entwurf: Entwurf = {
      id: crypto.randomUUID(),
      mailId,
      an: mail.von,
      betreff: `Re: ${mail.betreff}`,
      text,
      erstellt: ctx.jetzt.toISOString(),
      demo: true,
    };
    posteingang.entwuerfe.push(entwurf);
    return { entwurf } satisfies EntwurfErgebnis;
  },
};

const keineEingabe = z.object({});

const entwuerfeAnzeigen: ReadTool<typeof keineEingabe> = {
  description: "Liefert die gespeicherten Antwort-Entwürfe, neueste zuerst.",
  effect: "read",
  input: keineEingabe,
  async execute(_eingabe, ctx) {
    const entwuerfe = [
      ...posteingangVon(ctx.nutzerId, ctx.jetzt).entwuerfe,
    ].reverse();
    return { entwuerfe } satisfies EntwuerfeAnzeigenErgebnis;
  },
};

/**
 * Beispiel-Modul mit erfundenen Mails. Wird im Anschluss-Block durch den
 * Posteingang mit Gmail ersetzt; Gmail-Berechtigungen nur mit Thies' Freigabe.
 */
export const posteingangDemo: JarvisModule = {
  id: "posteingang-demo",
  name: "Posteingang (Demo)",
  description:
    "Demo-Posteingang mit erfundenen Mails und Antwort-Entwürfen. Sendet nie etwas. Liegt nur im Arbeitsspeicher.",
  googleScopes: [],
  tools: {
    mails_anzeigen: mailsAnzeigen,
    mail_lesen: mailLesen,
    antwort_entwurf_anlegen: antwortEntwurfAnlegen,
    entwuerfe_anzeigen: entwuerfeAnzeigen,
  },
};
