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
        "Im Demo-Posteingang liegen 8 Mails, die neueste zuerst:",
        "• heute, 07:45 – Hausverwaltung Sonnenhof: Wartung der Heizung am Donnerstag (braucht dich heute)",
        "• heute, 07:10 – Fahrradladen Speiche: Dein Fahrrad ist fertig",
        "• heute, 06:05 – Wochenmarkt Neustadt: Kürbiswochen auf dem Markt",
        "• gestern, 22:15 – Gewinnspiel-Team: Sie haben gewonnen!!!",
        "• gestern, 17:40 – Lena Berger: Unterlagen für Montag (braucht dich heute)",
        "• gestern, 09:30 – Praxis am Markt: Ihr Kontrolltermin",
        "• Donnerstag, 8. Oktober – Stadtbibliothek: Erinnerung: Leihfrist abgelaufen (braucht dich heute)",
        "• Mittwoch, 7. Oktober – Stadtwerke: Ihr Abschlag für Strom",
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
    expect(antwort).toContain(
      "Einordnung: braucht dich heute. Grund: Die Hausverwaltung fragt, ob der Termin passt, und wartet auf deine Antwort.",
    );
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

  it("„Was ist heute wichtig in meinen Mails?“ nennt nur, was dich heute braucht, mit Grund", async () => {
    expect(
      await neueSitzung().frage("Was ist heute wichtig in meinen Mails?"),
    ).toBe(
      [
        "Heute brauchen dich 3 Mails:",
        "• Hausverwaltung Sonnenhof: Heizungswartung am Donnerstag ab 8 Uhr, bitte bestätigen.",
        "  Grund: Die Hausverwaltung fragt, ob der Termin passt, und wartet auf deine Antwort.",
        "• Lena Berger: Bittet um die Unterlagen für Montag, bis Freitag.",
        "  Grund: Lena braucht die Unterlagen bis Freitag, und am Montag ist schon die Besprechung.",
        "• Stadtbibliothek: Buch überfällig, bitte zurückgeben oder verlängern.",
        "  Grund: Die Leihfrist ist schon abgelaufen; je länger das Buch liegt, desto höher die Gebühr.",
        "",
        "Der Rest kann warten (3) oder ist egal (2). Mit „Fass mir meine Mails zusammen“ siehst du alle.",
      ].join("\n"),
    );
  });

  it("„Fass mir meine Mails zusammen“ ordnet alle ein, jede mit Grund", async () => {
    const antwort = await neueSitzung().frage("Fass mir meine Mails zusammen");

    expect(antwort).toContain("Dein Demo-Posteingang in Kurzform (8 Mails):");
    const reihenfolge = [
      "Braucht dich heute (3):",
      "Kann warten (3):",
      "Egal (2):",
    ].map((t) => antwort.indexOf(t));
    expect(reihenfolge.every((i) => i >= 0)).toBe(true);
    expect(reihenfolge).toEqual([...reihenfolge].sort((a, b) => a - b));
    expect(antwort.match(/ {2}Grund: /g)).toHaveLength(8);
    expect(antwort).toContain(
      "• Gewinnspiel-Team: Angeblicher Gewinn, bitte nichts anklicken.\n  Grund: Ein unbekannter Absender verspricht einen Gewinn und will Bankdaten, typisch für Spam.",
    );
  });
});
