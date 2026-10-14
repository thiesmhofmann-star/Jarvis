// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aktionenImArbeitsspeicher } from "@/core/guard/aktionen";
import { erstelleSchutzschicht } from "@/core/guard/schutzschicht";
import { findeWerkzeug, werkzeuge as registriert } from "@/modules/registry";
import { erstelleChat } from "../chat";
import type { Nachricht, WerkzeugAngebot } from "../gehirn";
import { gespraecheImArbeitsspeicher } from "../gespraeche";
import { DEMO_ANTWORT, erstelleDemoGehirn } from ".";
import {
  findeDauer,
  findeTag,
  findeUhrzeit,
  findeUmbenennung,
  zerlege,
} from "./verstehen";

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

function neueSitzung() {
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
    karte: async (satz: string) => {
      const eintraege = await chat.sende(satz, c);
      const karte = eintraege.find((e) => e.art === "freigabe");
      if (karte?.art !== "freigabe") {
        throw new Error(`Karte erwartet, bekommen: ${text(eintraege)}`);
      }
      return karte.aktion;
    },
    freigeben: async (id: string) => {
      const ergebnis = await chat.entscheide(id, "freigeben", c);
      if (ergebnis.art !== "ok") throw new Error(ergebnis.meldung);
      return text(ergebnis.eintraege);
    },
  };
}

describe("Datumsangaben", () => {
  const tag = (text: string) => findeTag(zerlege(text), jetzt)?.datum ?? null;

  it("versteht „21.10.“, „21.10.2026“, „21. Oktober“ und „am 3. November 2026“", () => {
    expect(tag("Was steht am 21.10. an?")).toBe("2026-10-21");
    expect(tag("am 21.10.2026")).toBe("2026-10-21");
    expect(tag("Was steht am 21. Oktober an?")).toBe("2026-10-21");
    expect(tag("am 3. November 2026")).toBe("2026-11-03");
  });

  it("nimmt ohne Jahr den nächsten solchen Tag, heute zählt mit", () => {
    expect(tag("am 10.10.")).toBe("2026-10-10");
    expect(tag("am 5.10.")).toBe("2027-10-05");
  });

  it("überspringt Tage, die es nicht gibt, und Uhrzeiten", () => {
    expect(tag("am 31.4.")).toBeNull();
    expect(tag("um 9.10")).toBeNull();
    expect(tag("9.10 Uhr")).toBeNull();
    expect(findeUhrzeit(zerlege("9.10 Uhr"))).toMatchObject({
      stunde: 9,
      minute: 10,
    });
  });
});

describe("Dauern und neue Titel", () => {
  const dauer = (text: string) => findeDauer(zerlege(text))?.minuten ?? null;

  it("versteht Stunden, Minuten, halbe und zusammengesetzte Dauern", () => {
    expect(dauer("dauert 2 Stunden")).toBe(120);
    expect(dauer("dauert 90 Minuten")).toBe(90);
    expect(dauer("dauert eine halbe Stunde")).toBe(30);
    expect(dauer("dauert anderthalb Stunden")).toBe(90);
    expect(dauer("dauert 1,5 Stunden")).toBe(90);
    expect(dauer("dauert 1 Stunde und 30 Minuten")).toBe(90);
    expect(dauer("dauert lange")).toBeNull();
  });

  it("findet den neuen Titel in allen Satzformen", () => {
    const titel = (text: string) => findeUmbenennung(zerlege(text))?.titel;
    expect(titel("Benenne Laufen im Park um in Joggen")).toBe("Joggen");
    expect(titel("Benenne Laufen im Park in Abendlauf am See um")).toBe(
      "Abendlauf am See",
    );
    expect(titel("Training heißt ab jetzt Fußball")).toBe("Fußball");
    expect(titel("Ändere den Titel von Mittagspause in Lunch")).toBe("Lunch");
    expect(titel("Was steht heute an?")).toBeUndefined();
  });
});

describe("Demo-Gehirn: Datum in allen Sätzen", () => {
  it("„Was steht am 21. Oktober an?“", async () => {
    expect(await frage("Was steht am 21. Oktober an?")).toEqual({
      art: "werkzeug",
      name: "termine_am_tag",
      eingabe: { tag: "2026-10-21" },
    });
  });

  it("„Trag Zahnarzt am 3.11. um 9 Uhr ein“ (nach der Zeitumstellung)", async () => {
    expect(await frage("Trag Zahnarzt am 3.11. um 9 Uhr ein")).toEqual({
      art: "werkzeug",
      name: "termin_anlegen",
      eingabe: { titel: "Zahnarzt", beginn: "2026-11-03T08:00:00.000Z" },
    });
  });

  it("„Neue Aufgabe: Steuererklärung abgeben bis 31.10.“", async () => {
    expect(
      await frage("Neue Aufgabe: Steuererklärung abgeben bis 31.10."),
    ).toEqual({
      art: "werkzeug",
      name: "aufgabe_anlegen",
      eingabe: { titel: "Steuererklärung abgeben", frist: "2026-10-31" },
    });
  });

  it("„Verschieb Laufen im Park auf den 21.10.“: neuer Tag, gleiche Uhrzeit", async () => {
    const s = neueSitzung();
    const karte = await s.karte("Verschieb Laufen im Park auf den 21.10.");
    expect(karte.vorschau.daten).toContainEqual({
      label: "Neu",
      wert: "Mittwoch, 21. Oktober, 18:00 bis 19:00 Uhr",
    });
  });
});

describe("Termine: Dauer und Titel ändern", () => {
  it("„Training dauert ab jetzt 2 Stunden“: Karte, Freigeben, jede Woche länger", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Training dauert ab jetzt 2 Stunden");
    expect(karte.vorschau.daten).toContainEqual({
      label: "Neu",
      wert: "Samstag, 10. Oktober, 20:00 bis 22:00 Uhr",
    });
    expect(karte.vorschau.daten).toContainEqual({
      label: "Gilt für",
      wert: "Ab Samstag, 10. Oktober jede Woche",
    });

    expect(await s.freigeben(karte.id)).toBe(
      "Erledigt: „Training“ dauert jetzt 2 Stunden, ab Samstag, 10. Oktober jede Woche. Frühere Termine bleiben, wie sie waren.",
    );
    expect(await s.frage("Wann ist Training?")).toContain(
      "• Samstag, 24. Oktober, 20:00–22:00 Uhr: Training",
    );
  });

  it("„Benenne Laufen im Park um in Joggen“: Karte zeigt beide Titel", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Benenne Laufen im Park um in Joggen");
    expect(karte.vorschau.daten).toEqual(
      expect.arrayContaining([
        {
          label: "Bisher",
          wert: "„Laufen im Park“, Samstag, 10. Oktober, 18:00 bis 19:00 Uhr",
        },
        {
          label: "Neu",
          wert: "„Joggen“, Samstag, 10. Oktober, 18:00 bis 19:00 Uhr",
        },
      ]),
    );
    expect(await s.freigeben(karte.id)).toBe(
      "Erledigt: „Laufen im Park“ heißt jetzt „Joggen“.",
    );
    expect(await s.frage("Was steht heute an?")).toContain(
      "18:00–19:00 Uhr: Joggen",
    );
  });

  it("„Training heißt ab jetzt Fußball“ benennt den Dauertermin ab heute um", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Training heißt ab jetzt Fußball");
    expect(karte.vorschau.daten).toContainEqual({
      label: "Gilt für",
      wert: "Ab Samstag, 10. Oktober jede Woche",
    });
    expect(await s.freigeben(karte.id)).toBe(
      "Erledigt: „Training“ heißt jetzt „Fußball“, ab Samstag, 10. Oktober jede Woche. Frühere Termine bleiben, wie sie waren.",
    );
    expect(await s.frage("Wann ist Fußball?")).toContain("5 Termine");
  });

  it("verschiebt und verlängert in einem Satz", async () => {
    const s = neueSitzung();

    const karte = await s.karte(
      "Verschieb Laufen im Park auf 19 Uhr, es dauert 90 Minuten",
    );
    expect(karte.vorschau.daten).toContainEqual({
      label: "Neu",
      wert: "Samstag, 10. Oktober, 19:00 bis 20:30 Uhr",
    });
    expect(await s.freigeben(karte.id)).toBe(
      "Erledigt: „Laufen im Park“ beginnt jetzt am Samstag, 10. Oktober, um 19:00 Uhr und dauert jetzt 1 Stunde und 30 Minuten.",
    );
  });

  it("hält Fragen und andere Sätze mit „heißt“ oder „dauert“ nicht für Änderungen", async () => {
    for (const satz of [
      "Wie lange dauert Training?",
      "Das heißt, ich komme später",
      "Wie heißt der Termin am Abend?",
    ]) {
      expect(await frage(satz)).toEqual({ art: "text", text: DEMO_ANTWORT });
    }
  });

  it("fragt bei einer unmöglichen Dauer nach", async () => {
    expect(await frage("Training dauert ab jetzt 30 Stunden")).toMatchObject({
      art: "text",
      text: expect.stringContaining("höchstens 24 Stunden"),
    });
  });
});
