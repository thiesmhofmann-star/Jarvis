// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { WerkzeugKontext, WriteTool } from "../vertrag";
import {
  posteingangDemo,
  type EntwuerfeAnzeigenErgebnis,
  type MailLesenErgebnis,
  type MailsAnzeigenErgebnis,
} from ".";
import { MAX_ENTWUERFE } from "./mails";

// Samstag, 10. Oktober 2026, 10:00 Uhr in Berlin
const jetzt = new Date("2026-10-10T08:00:00Z");
const ctx = (): WerkzeugKontext => ({ nutzerId: crypto.randomUUID(), jetzt });
const werkzeug = posteingangDemo.tools;

async function lies<T>(c: WerkzeugKontext, name: string, eingabe: object) {
  const tool = werkzeug[name]!;
  return (await tool.execute(tool.input.parse(eingabe), c)) as T;
}
const entwurf = werkzeug.antwort_entwurf_anlegen as WriteTool;

describe("Modul Posteingang (Demo)", () => {
  it("startet mit acht erfundenen Mails, neueste zuerst, nur .example-Adressen, alle eingeordnet", async () => {
    const { mails } = await lies<MailsAnzeigenErgebnis>(
      ctx(),
      "mails_anzeigen",
      {},
    );

    expect(mails.map((m) => [m.von, m.einordnung])).toEqual([
      ["Hausverwaltung Sonnenhof", "heute"],
      ["Fahrradladen Speiche", "warten"],
      ["Wochenmarkt Neustadt", "egal"],
      ["Gewinnspiel-Team", "egal"],
      ["Lena Berger", "heute"],
      ["Praxis am Markt", "warten"],
      ["Stadtbibliothek", "heute"],
      ["Stadtwerke", "warten"],
    ]);
    expect(mails.every((m) => m.adresse.endsWith(".example"))).toBe(true);
    expect(mails.every((m) => m.demo && m.vorschau.length <= 80)).toBe(true);
    expect(mails.every((m) => m.grund.length > 20 && m.kurzfassung)).toBe(true);
    expect(mails[0]).not.toHaveProperty("text");
  });

  it("sucht in Absender und Betreff und liest eine Mail ganz", async () => {
    const c = ctx();
    const { mails } = await lies<MailsAnzeigenErgebnis>(c, "mails_anzeigen", {
      suche: "hausverwaltung",
    });
    expect(mails).toHaveLength(1);

    const { mail } = await lies<MailLesenErgebnis>(c, "mail_lesen", {
      id: mails[0]!.id,
    });
    expect(mail.text).toContain("Heizungswartung");
    await expect(
      lies(c, "mail_lesen", { id: "gibt-es-nicht" }),
    ).rejects.toThrow("Diese Mail gibt es nicht im Demo-Posteingang.");
  });

  it("legt Antwort-Entwürfe erst nach Freigabe ab und sendet nichts", async () => {
    const c = ctx();
    const { mails } = await lies<MailsAnzeigenErgebnis>(c, "mails_anzeigen", {
      suche: "Lena",
    });
    const eingabe = entwurf.input.parse({
      mailId: mails[0]!.id,
      text: "Schicke ich dir bis Freitag!",
    });

    const karte = await entwurf.preview(eingabe, c);
    expect(karte.titel).toBe("Antwort-Entwurf speichern");
    expect(karte.beschreibung).toContain("Gesendet wird nichts.");
    expect(karte.daten).toEqual([
      { label: "An", wert: "Lena Berger" },
      { label: "Betreff", wert: "Re: Unterlagen für Montag" },
      { label: "Text", wert: "Schicke ich dir bis Freitag!" },
      {
        label: "Posteingang",
        wert: "Demo-Posteingang (nur im Arbeitsspeicher)",
      },
    ]);
    expect(
      (await lies<EntwuerfeAnzeigenErgebnis>(c, "entwuerfe_anzeigen", {}))
        .entwuerfe,
    ).toEqual([]);

    await entwurf.execute(eingabe, c);
    const { entwuerfe } = await lies<EntwuerfeAnzeigenErgebnis>(
      c,
      "entwuerfe_anzeigen",
      {},
    );
    expect(entwuerfe).toMatchObject([
      { an: "Lena Berger", text: "Schicke ich dir bis Freitag!", demo: true },
    ]);
    // Es gibt kein Werkzeug zum Senden.
    expect(Object.keys(werkzeug).some((n) => /send/.test(n))).toBe(false);
  });

  it("begrenzt die Zahl der Entwürfe", async () => {
    const c = ctx();
    const { mails } = await lies<MailsAnzeigenErgebnis>(
      c,
      "mails_anzeigen",
      {},
    );
    const eingabe = entwurf.input.parse({ mailId: mails[0]!.id, text: "Ok" });
    for (let i = 0; i < MAX_ENTWUERFE; i++) await entwurf.execute(eingabe, c);

    await expect(entwurf.execute(eingabe, c)).rejects.toThrow(
      "zu viele Entwürfe",
    );
  });
});
