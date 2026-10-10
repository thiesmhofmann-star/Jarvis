// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { AufgabeAnsicht } from "@/modules/aufgaben-demo";
import { werkzeuge as registriert } from "@/modules/registry";
import type { Nachricht, WerkzeugAngebot } from "../gehirn";
import { erstelleDemoGehirn } from ".";

// Samstag, 10. Oktober 2026, 10:00 Uhr in Berlin
const samstag = new Date("2026-10-10T08:00:00Z");
const werkzeuge: WerkzeugAngebot[] = registriert.map(({ name, werkzeug }) => ({
  name,
  beschreibung: werkzeug.description,
  effekt: werkzeug.effect,
  eingabe: werkzeug.input,
}));
const gehirn = erstelleDemoGehirn();

function frage(text: string, jetzt = samstag) {
  return gehirn.antworte({
    verlauf: [{ rolle: "nutzer", text }],
    werkzeuge,
    jetzt,
  });
}

function aufgabe(titel: string, frist?: string): AufgabeAnsicht {
  return {
    id: `id-${titel}`,
    titel,
    frist,
    erledigt: false,
    demo: true,
    ueberfaellig: false,
  };
}

/** Verlauf nach dem ersten Schritt: Thies' Satz und die gelesene Liste. */
function nachListe(text: string, aufgaben: AufgabeAnsicht[]): Nachricht[] {
  return [
    { rolle: "nutzer", text },
    {
      rolle: "werkzeug",
      name: "aufgaben_anzeigen",
      eingabe: {},
      ausgang: { art: "ergebnis", ergebnis: { faelligBis: null, aufgaben } },
    },
  ];
}

describe("Demo-Gehirn: Aufgaben anlegen", () => {
  it("„Neue Aufgabe: Steuererklärung abgeben bis Freitag“ → aufgabe_anlegen mit Frist", async () => {
    expect(
      await frage("Neue Aufgabe: Steuererklärung abgeben bis Freitag"),
    ).toEqual({
      art: "werkzeug",
      name: "aufgabe_anlegen",
      eingabe: { titel: "Steuererklärung abgeben", frist: "2026-10-16" },
    });
  });

  it("„Neue Aufgabe: Fahrrad aufpumpen“ → ohne Frist und ohne Rückfrage", async () => {
    expect(await frage("Neue Aufgabe: Fahrrad aufpumpen")).toEqual({
      art: "werkzeug",
      name: "aufgabe_anlegen",
      eingabe: { titel: "Fahrrad aufpumpen" },
    });
  });

  it("„Trag eine Aufgabe ein“ wird eine Aufgabe, kein Termin", async () => {
    expect(
      await frage("Trag mir eine Aufgabe ein: Rasen mähen bis morgen"),
    ).toEqual({
      art: "werkzeug",
      name: "aufgabe_anlegen",
      eingabe: { titel: "Rasen mähen", frist: "2026-10-11" },
    });
  });
});

describe("Demo-Gehirn: Aufgaben anzeigen", () => {
  it("„Was ist diese Woche fällig?“ → bis Sonntag", async () => {
    expect(await frage("Was ist diese Woche fällig?")).toEqual({
      art: "werkzeug",
      name: "aufgaben_anzeigen",
      eingabe: { faelligBis: "2026-10-11" },
    });
  });

  it("„diese Woche“ ist am Sonntag heute und am Montag der nächste Sonntag", async () => {
    const sonntag = new Date("2026-10-11T08:00:00Z");
    const montag = new Date("2026-10-12T08:00:00Z");

    expect(await frage("Was ist diese Woche fällig?", sonntag)).toMatchObject({
      eingabe: { faelligBis: "2026-10-11" },
    });
    expect(await frage("Was ist diese Woche fällig?", montag)).toMatchObject({
      eingabe: { faelligBis: "2026-10-18" },
    });
  });

  it.each(["Was muss ich erledigen?", "Meine Aufgaben"])(
    "„%s“ → alle offenen Aufgaben",
    async (text) => {
      expect(await frage(text)).toEqual({
        art: "werkzeug",
        name: "aufgaben_anzeigen",
        eingabe: {},
      });
    },
  );

  it("benennt Überfälliges in der Antwort", async () => {
    const antwort = await gehirn.antworte({
      verlauf: [
        { rolle: "nutzer", text: "Was ist diese Woche fällig?" },
        {
          rolle: "werkzeug",
          name: "aufgaben_anzeigen",
          eingabe: { faelligBis: "2026-10-11" },
          ausgang: {
            art: "ergebnis",
            ergebnis: {
              faelligBis: "2026-10-11",
              aufgaben: [
                {
                  ...aufgabe("Bibliotheksbuch zurückgeben", "2026-10-08"),
                  ueberfaellig: true,
                },
                aufgabe("Paket zur Post bringen", "2026-10-10"),
              ],
            },
          },
        },
      ],
      werkzeuge,
      jetzt: samstag,
    });

    expect(antwort).toEqual({
      art: "text",
      text:
        "Bis Sonntag, 11. Oktober, sind 2 Demo-Aufgaben fällig:\n" +
        "• Bibliotheksbuch zurückgeben – überfällig (Frist war Donnerstag, 8. Oktober)\n" +
        "• Paket zur Post bringen – fällig heute",
    });
  });
});

describe("Demo-Gehirn: Aufgaben abhaken in zwei Schritten", () => {
  it("Schritt 1: liest erst die offenen Aufgaben", async () => {
    expect(await frage("Steuererklärung ist erledigt")).toEqual({
      art: "werkzeug",
      name: "aufgaben_anzeigen",
      eingabe: {},
    });
  });

  it("Schritt 2: wählt die passende Aufgabe und hakt sie über ihre ID ab", async () => {
    const antwort = await gehirn.antworte({
      verlauf: nachListe("Steuererklärung ist erledigt", [
        aufgabe("Paket zur Post bringen"),
        aufgabe("Steuererklärung abgeben", "2026-10-16"),
      ]),
      werkzeuge,
      jetzt: samstag,
    });

    expect(antwort).toEqual({
      art: "werkzeug",
      name: "aufgabe_erledigen",
      eingabe: { id: "id-Steuererklärung abgeben" },
    });
  });

  it("fragt bei mehreren Treffern nach und nennt sie", async () => {
    const antwort = await gehirn.antworte({
      verlauf: nachListe("Steuererklärung ist erledigt", [
        aufgabe("Steuererklärung abgeben", "2026-10-16"),
        aufgabe("Steuererklärung prüfen"),
      ]),
      werkzeuge,
      jetzt: samstag,
    });

    expect(antwort.art).toBe("text");
    expect(antwort).toMatchObject({
      text: expect.stringContaining(
        "„Steuererklärung abgeben“ (Frist Freitag, 16. Oktober), „Steuererklärung prüfen“ (ohne Frist)",
      ),
    });
  });

  it("sagt freundlich, wenn keine offene Aufgabe passt", async () => {
    const antwort = await gehirn.antworte({
      verlauf: nachListe("Fliegen lernen ist erledigt", [
        aufgabe("Paket zur Post bringen"),
      ]),
      werkzeuge,
      jetzt: samstag,
    });

    expect(antwort).toEqual({
      art: "text",
      text: "Ich finde keine offene Demo-Aufgabe zu „Fliegen lernen“. Mit „Meine Aufgaben“ zeige ich dir alle offenen.",
    });
  });
});

describe("Demo-Gehirn: Kalender-Sätze bleiben beim Kalender", () => {
  it.each([
    ["Was steht heute an?", "termine_am_tag"],
    ["Was steht Freitag an?", "termine_am_tag"],
    ["Trag Zahnarzt Freitag 10 Uhr ein", "termin_anlegen"],
  ])("„%s“ → %s", async (text, werkzeug) => {
    expect(await frage(text)).toMatchObject({
      art: "werkzeug",
      name: werkzeug,
    });
  });
});
