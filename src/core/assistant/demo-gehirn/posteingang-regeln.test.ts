// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aktionenImArbeitsspeicher } from "@/core/guard/aktionen";
import { erstelleSchutzschicht } from "@/core/guard/schutzschicht";
import { findeWerkzeug, werkzeuge } from "@/modules/registry";
import { erstelleChat } from "../chat";
import { gespraecheImArbeitsspeicher } from "../gespraeche";
import { erstelleDemoGehirn } from ".";

// Integration: Demo-Posteingang vom Satz bis zum Entwurf.
// Samstag, 10. Oktober 2026, 10:00 Uhr in Berlin
const jetzt = new Date("2026-10-10T08:00:00Z");

function neueSitzung() {
  const chat = erstelleChat({
    gehirn: erstelleDemoGehirn(),
    schutzschicht: erstelleSchutzschicht({
      findeWerkzeug,
      speicher: aktionenImArbeitsspeicher(),
    }),
    werkzeuge,
    gespraeche: gespraecheImArbeitsspeicher(),
  });
  const c = { nutzerId: crypto.randomUUID(), jetzt };
  const text = (e: { art: string; text?: string }[]) =>
    e.map((x) => (x.art === "jarvis" ? x.text : "")).join("\n");
  return {
    frage: async (satz: string) => text(await chat.sende(satz, c)),
    karte: async (satz: string) => {
      const eintraege = await chat.sende(satz, c);
      const karte = eintraege.find((e) => e.art === "freigabe");
      if (karte?.art !== "freigabe") {
        throw new Error(`Karte erwartet, bekommen: ${text(eintraege)}`);
      }
      return karte.aktion;
    },
    entscheide: async (id: string, wahl: "freigeben" | "ablehnen") => {
      const ergebnis = await chat.entscheide(id, wahl, c);
      if (ergebnis.art !== "ok") throw new Error(ergebnis.meldung);
      return text(ergebnis.eintraege);
    },
  };
}

describe("Posteingang im Chat", () => {
  it("„Was ist neu im Posteingang?“ listet die Mails, neueste zuerst", async () => {
    expect(await neueSitzung().frage("Was ist neu im Posteingang?")).toBe(
      [
        "Im Demo-Posteingang liegen 4 Mails, die neueste zuerst:",
        "• heute, 07:45 – Hausverwaltung Sonnenhof: Wartung der Heizung am Donnerstag",
        "• heute, 07:10 – Fahrradladen Speiche: Dein Fahrrad ist fertig",
        "• gestern, 17:40 – Lena Berger: Unterlagen für Montag",
        "• Donnerstag, 8. Oktober – Stadtbibliothek: Erinnerung: Leihfrist abgelaufen",
        "",
        "Mit „Zeig die Mail von …“ lese ich dir eine vor.",
      ].join("\n"),
    );
  });

  it("„Zeig die Mail von der Hausverwaltung“ liest sie ganz vor", async () => {
    const antwort = await neueSitzung().frage(
      "Zeig die Mail von der Hausverwaltung",
    );

    expect(antwort).toContain(
      "Mail von Hausverwaltung Sonnenhof <service@hausverwaltung-sonnenhof.example>, heute, 07:45",
    );
    expect(antwort).toContain("Betreff: Wartung der Heizung am Donnerstag");
    expect(antwort).toContain("Passt Ihnen der Termin?");
    expect(antwort).toContain("sende nichts");
  });

  it("„Was schreibt Lena?“ und eine unbekannte Absenderin", async () => {
    const s = neueSitzung();
    expect(await s.frage("Was schreibt Lena?")).toContain(
      "Betreff: Unterlagen für Montag",
    );
    expect(await s.frage("Zeig die Mail von Tante Erna")).toBe(
      "Im Demo-Posteingang finde ich keine Mail zu „Tante Erna“. Mit „Was ist neu im Posteingang?“ zeige ich dir alle.",
    );
  });

  it("„Antworte der Hausverwaltung: …“: Karte, Freigeben, Entwurf, nichts gesendet", async () => {
    const s = neueSitzung();

    const karte = await s.karte(
      "Antworte der Hausverwaltung: Donnerstag passt, danke! Ich bin ab 8 Uhr da.",
    );
    expect(karte.vorschau.daten).toContainEqual({
      label: "Text",
      wert: "Donnerstag passt, danke! Ich bin ab 8 Uhr da.",
    });
    expect(await s.entscheide(karte.id, "freigeben")).toBe(
      "Gespeichert: Der Antwort-Entwurf an Hausverwaltung Sonnenhof liegt im Demo-Posteingang. Gesendet wird nichts.",
    );
    expect(await s.frage("Meine Entwürfe")).toBe(
      "Im Demo-Posteingang liegt 1 Entwurf. Gesendet wurde nichts.\n• An Hausverwaltung Sonnenhof – Re: Wartung der Heizung am Donnerstag: „Donnerstag passt, danke! Ich bin ab 8 Uhr da.“",
    );
  });

  it("„Ablehnen“ speichert keinen Entwurf", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Antworte Lena: Mach ich!");
    expect(await s.entscheide(karte.id, "ablehnen")).toBe(
      "In Ordnung, ich habe keinen Entwurf gespeichert.",
    );
    expect(await s.frage("Meine Entwürfe")).toBe(
      "Im Demo-Posteingang liegen keine Entwürfe.",
    );
  });

  it("fragt nach, wenn Empfänger oder Text fehlen", async () => {
    const s = neueSitzung();
    expect(await s.frage("Antworte Lena")).toContain(
      "Was soll in der Antwort an „Lena“ stehen?",
    );
    expect(await s.frage("Antworte der: Hallo")).toContain(
      "Wem soll ich antworten?",
    );
  });

  it("lässt Termin- und Aufgaben-Sätze mit „Mail“ in Ruhe", async () => {
    const s = neueSitzung();
    expect(
      (await s.karte("Neue Aufgabe: Mail an Lena schreiben")).vorschau.titel,
    ).toBe("Aufgabe anlegen");
    expect(
      (await s.karte("Trag Mails beantworten Freitag 10 Uhr ein")).vorschau
        .titel,
    ).toBe("Termin anlegen");
  });
});
