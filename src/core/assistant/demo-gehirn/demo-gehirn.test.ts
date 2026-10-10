// @vitest-environment node
import { describe, expect, it } from "vitest";
import { werkzeuge as registriert } from "@/modules/registry";
import type { Nachricht, WerkzeugAngebot } from "../gehirn";
import { DEMO_ANTWORT, erstelleDemoGehirn } from ".";

// Samstag, 10. Oktober 2026, 10:00 Uhr in Berlin
const jetzt = new Date("2026-10-10T08:00:00Z");
const werkzeuge: WerkzeugAngebot[] = registriert.map(({ name, werkzeug }) => ({
  name,
  beschreibung: werkzeug.description,
  effekt: werkzeug.effect,
  eingabe: werkzeug.input,
}));
const gehirn = erstelleDemoGehirn();

function frage(text: string, angebot = werkzeuge) {
  const verlauf: Nachricht[] = [{ rolle: "nutzer", text }];
  return gehirn.antworte({ verlauf, werkzeuge: angebot, jetzt });
}

describe("Demo-Gehirn wählt das richtige Werkzeug", () => {
  it("„Was steht heute an?“ → termine_am_tag für heute", async () => {
    expect(await frage("Was steht heute an?")).toEqual({
      art: "werkzeug",
      name: "termine_am_tag",
      eingabe: { tag: "2026-10-10" },
    });
  });

  it("„Was steht Freitag an?“ → termine_am_tag für den nächsten Freitag", async () => {
    expect(await frage("Was steht Freitag an?")).toMatchObject({
      name: "termine_am_tag",
      eingabe: { tag: "2026-10-16" },
    });
  });

  it("„Trag Zahnarzt Freitag 10 Uhr ein“ → termin_anlegen", async () => {
    expect(await frage("Trag Zahnarzt Freitag 10 Uhr ein")).toEqual({
      art: "werkzeug",
      name: "termin_anlegen",
      eingabe: { titel: "Zahnarzt", beginn: "2026-10-16T08:00:00.000Z" },
    });
  });

  it("versteht auch „am“, „um“ und Minuten", async () => {
    expect(
      await frage("Bitte trag mir am Montag um 9:30 Friseur ein."),
    ).toMatchObject({
      name: "termin_anlegen",
      eingabe: { titel: "Friseur", beginn: "2026-10-12T07:30:00.000Z" },
    });
  });

  it("fragt nach, wenn die Uhrzeit fehlt", async () => {
    const antwort = await frage("Trag Zahnarzt Freitag ein");

    expect(antwort.art).toBe("text");
    expect(antwort).toMatchObject({
      text: expect.stringContaining("Um wie viel Uhr"),
    });
  });

  it("antwortet bei Unbekanntem freundlich im Demo-Modus", async () => {
    expect(await frage("Wie wird das Wetter morgen?")).toEqual({
      art: "text",
      text: DEMO_ANTWORT,
    });
  });

  it("nutzt nur Werkzeuge, die angeboten werden", async () => {
    expect(await frage("Was steht heute an?", [])).toEqual({
      art: "text",
      text: DEMO_ANTWORT,
    });
  });

  it("fasst ein abgelehntes Eintragen in Worte", async () => {
    const antwort = await gehirn.antworte({
      verlauf: [
        {
          rolle: "werkzeug",
          name: "termin_anlegen",
          eingabe: {},
          ausgang: { art: "abgelehnt" },
        },
      ],
      werkzeuge,
      jetzt,
    });

    expect(antwort).toEqual({
      art: "text",
      text: "In Ordnung, ich habe nichts eingetragen.",
    });
  });
});
