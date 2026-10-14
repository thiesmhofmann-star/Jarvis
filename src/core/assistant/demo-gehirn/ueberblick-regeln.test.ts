// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aktionenImArbeitsspeicher } from "@/core/guard/aktionen";
import { erstelleSchutzschicht } from "@/core/guard/schutzschicht";
import { findeWerkzeug, werkzeuge as registriert } from "@/modules/registry";
import { erstelleChat } from "../chat";
import type { Nachricht, WerkzeugAngebot } from "../gehirn";
import { gespraecheImArbeitsspeicher } from "../gespraeche";
import { erstelleDemoGehirn } from ".";

// Samstag, 10. Oktober 2026, 10:00 Uhr in Berlin
const jetzt = new Date("2026-10-10T08:00:00Z");
const werkzeuge: WerkzeugAngebot[] = registriert.map(({ name, werkzeug }) => ({
  name,
  beschreibung: werkzeug.description,
  effekt: werkzeug.effect,
  eingabe: werkzeug.input,
}));

function frage(text: string) {
  const verlauf: Nachricht[] = [{ rolle: "nutzer", text }];
  return erstelleDemoGehirn().antworte({ verlauf, werkzeuge, jetzt });
}

/** Ganzer Ablauf mit echtem Demo-Kalender und echten Demo-Aufgaben */
async function chat(text: string) {
  const eintraege = await erstelleChat({
    gehirn: erstelleDemoGehirn(),
    schutzschicht: erstelleSchutzschicht({
      findeWerkzeug,
      speicher: aktionenImArbeitsspeicher(),
    }),
    werkzeuge: registriert,
    gespraeche: gespraecheImArbeitsspeicher(),
  }).sende(text, { nutzerId: crypto.randomUUID(), jetzt });
  return eintraege.map((e) => (e.art === "jarvis" ? e.text : "")).join("\n");
}

describe("Demo-Gehirn: Tagesüberblick", () => {
  for (const satz of [
    "Wie sieht mein Tag aus?",
    "Briefing",
    "Guten Morgen",
    "Gib mir einen Überblick",
  ]) {
    it(`„${satz}“ liest zuerst den Kalender von heute`, async () => {
      expect(await frage(satz)).toEqual({
        art: "werkzeug",
        name: "termine_am_tag",
        eingabe: { tag: "2026-10-10" },
      });
    });
  }

  it("„Wie sieht Freitag aus?“ nimmt den genannten Tag", async () => {
    expect(await frage("Wie sieht Freitag aus?")).toMatchObject({
      eingabe: { tag: "2026-10-16" },
    });
  });

  it("verwechselt andere Sätze nicht mit dem Überblick", async () => {
    expect(await frage("Was steht heute an?")).toMatchObject({
      name: "termine_am_tag",
    });
    expect(await frage("Wie sieht das Wetter morgen aus?")).toMatchObject({
      art: "text",
    });
  });

  it("verbindet Termine und fällige Aufgaben in einer Antwort", async () => {
    expect(await chat("Guten Morgen")).toBe(
      [
        "Guten Morgen! Dein Überblick für heute, Samstag, 10. Oktober:",
        "",
        "Termine (4):",
        "• 09:00–09:30 Uhr: Team-Besprechung",
        "• 12:30–13:30 Uhr: Mittagspause",
        "• 18:00–19:00 Uhr: Laufen im Park",
        "• 20:00–21:30 Uhr: Training (jede Woche)",
        "",
        "Fällige Aufgaben bis heute (2):",
        "• Bibliotheksbuch zurückgeben – überfällig (Frist war Donnerstag, 8. Oktober)",
        "• Paket zur Post bringen – fällig heute",
        "",
        "Posteingang: 2 neue Mails von heute.",
      ].join("\n"),
    );
  });

  it("zeigt für einen anderen Tag auch, was bis dahin fällig ist, und leere Teile", async () => {
    const antwort = await chat("Wie sieht Montag aus?");

    expect(antwort).toContain("Dein Überblick für Montag, 12. Oktober:");
    expect(antwort).toContain("Termine: keine.");
    expect(antwort).toContain("Fällige Aufgaben bis Montag, 12. Oktober (2):");
    expect(antwort).not.toContain("Guten Morgen");
    // Neue Mails nur im Überblick für heute
    expect(antwort).not.toContain("Posteingang");
  });
});

/** Ein Gespräch mit mehreren Nachrichten in derselben Sitzung */
function sitzung() {
  const chat = erstelleChat({
    gehirn: erstelleDemoGehirn(),
    schutzschicht: erstelleSchutzschicht({
      findeWerkzeug,
      speicher: aktionenImArbeitsspeicher(),
    }),
    werkzeuge: registriert,
    gespraeche: gespraecheImArbeitsspeicher(),
  });
  const c = { nutzerId: crypto.randomUUID(), jetzt };
  const text = (e: { art: string; text?: string }[]) =>
    e.map((x) => (x.art === "jarvis" ? x.text : "")).join("\n");
  return {
    frage: async (satz: string) => text(await chat.sende(satz, c)),
    abhaken: async (satz: string) => {
      const [karte] = await chat.sende(satz, c);
      if (karte?.art !== "freigabe") throw new Error("Karte erwartet");
      await chat.entscheide(karte.aktion.id, "freigeben", c);
    },
  };
}

describe("Demo-Gehirn: Abendrückblick", () => {
  it("„Wie war mein Tag?“: erledigt, heute, morgen, offen", async () => {
    const s = sitzung();
    await s.abhaken("Paket ist erledigt");

    expect(await s.frage("Wie war mein Tag?")).toBe(
      [
        "Dein Abendrückblick für heute, Samstag, 10. Oktober:",
        "",
        "Heute erledigt (1):",
        "• Paket zur Post bringen",
        "",
        "Heute im Kalender (4):",
        "• 09:00–09:30 Uhr: Team-Besprechung",
        "• 12:30–13:30 Uhr: Mittagspause",
        "• 18:00–19:00 Uhr: Laufen im Park",
        "• 20:00–21:30 Uhr: Training (jede Woche)",
        "",
        "Morgen, Sonntag, 11. Oktober (1):",
        "• 10:00–11:00 Uhr: Yoga (jede Woche)",
        "",
        "Offen bis morgen (1):",
        "• Bibliotheksbuch zurückgeben – überfällig (Frist war Donnerstag, 8. Oktober)",
        "Dazu 2 weitere offene Aufgaben mit späterer oder ohne Frist.",
      ].join("\n"),
    );
  });

  it("„Abendrückblick“ ohne Erledigtes", async () => {
    const antwort = await sitzung().frage("Abendrückblick");
    expect(antwort).toContain("Heute erledigt: nichts abgehakt.");
    expect(antwort).toContain("Offen bis morgen (2):");
  });

  it("„Was ist noch nicht erledigt?“ zeigt die offenen Aufgaben", async () => {
    expect(await sitzung().frage("Was ist noch nicht erledigt?")).toContain(
      "Du hast 4 offene Demo-Aufgaben:",
    );
  });
});
