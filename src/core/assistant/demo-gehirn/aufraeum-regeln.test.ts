// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aktionenImArbeitsspeicher } from "@/core/guard/aktionen";
import { erstelleSchutzschicht } from "@/core/guard/schutzschicht";
import {
  kalenderDemo,
  type DauertermineAnzeigenErgebnis,
} from "@/modules/kalender-demo";
import { findeWerkzeug, werkzeuge } from "@/modules/registry";
import { erstelleChat } from "../chat";
import { gespraecheImArbeitsspeicher } from "../gespraeche";
import { DEMO_ANTWORT, erstelleDemoGehirn } from ".";

// Kalender aufräumen (Ticket F): Durchgang über mehrere Nachrichten.
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
    c,
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

const START = "Lass uns meine festen Termine durchgehen";
const FRAGE_1 =
  "Fester Termin 1 von 3: „Training“, jeden Samstag, 20:00–21:30 Uhr. Nächstes Mal: heute, Samstag, 10. Oktober. Stimmt das noch?";
const FRAGE_2 =
  "Fester Termin 2 von 3: „Yoga“, jeden Sonntag, 10:00–11:00 Uhr. Nächstes Mal: Sonntag, 11. Oktober. Stimmt das noch?";
const FRAGE_3 =
  "Fester Termin 3 von 3: „Gitarrenunterricht“, jeden Donnerstag, 17:00–17:45 Uhr. Nächstes Mal: Donnerstag, 15. Oktober. Stimmt das noch?";

describe("Werkzeug dauertermine_anzeigen", () => {
  it("liefert die drei Start-Dauertermine nach nächstem Vorkommen", async () => {
    const werkzeug = kalenderDemo.tools.dauertermine_anzeigen!;
    const { dauertermine } = (await werkzeug.execute(werkzeug.input.parse({}), {
      nutzerId: crypto.randomUUID(),
      jetzt,
    })) as DauertermineAnzeigenErgebnis;

    expect(
      dauertermine.map((d) => [
        d.titel,
        d.wochentag,
        d.uhrzeit,
        d.dauerMinuten,
        d.naechstes.vorkommen,
      ]),
    ).toEqual([
      ["Training", "Samstag", "20:00", 90, "2026-10-10"],
      ["Yoga", "Sonntag", "10:00", 60, "2026-10-11"],
      ["Gitarrenunterricht", "Donnerstag", "17:00", 45, "2026-10-15"],
    ]);
  });
});

describe("Kalender aufräumen im Chat", () => {
  it("geht alle Dauertermine durch: passt, ändern, entfernen, Zusammenfassung", async () => {
    const s = neueSitzung();

    const start = await s.frage(START);
    expect(start).toContain("Wir gehen deine 3 festen Termine durch.");
    expect(start).toContain(FRAGE_1);

    expect(await s.frage("Passt")).toBe(FRAGE_2);

    const aendern = await s.karte("ab jetzt 9 Uhr");
    expect(aendern.vorschau.titel).toBe("Termin ändern");
    expect(aendern.vorschau.daten).toContainEqual({
      label: "Gilt für",
      wert: "Ab Sonntag, 11. Oktober jede Woche",
    });
    expect(await s.entscheide(aendern.id, "freigeben")).toBe(
      `Geändert: „Yoga“ ist ab Sonntag, 11. Oktober, jeden Sonntag von 09:00 bis 10:00 Uhr.\n\n${FRAGE_3}`,
    );

    const absagen = await s.karte("Gibt es nicht mehr");
    expect(absagen.vorschau.daten).toContainEqual({
      label: "Fällt weg",
      wert: "Ab Donnerstag, 15. Oktober jede Woche",
    });
    expect(await s.entscheide(absagen.id, "freigeben")).toBe(
      "Entfernt: „Gitarrenunterricht“ steht ab Donnerstag, 15. Oktober, nicht mehr im Demo-Kalender.\n\nFertig: Alle 3 festen Termine sind durchgegangen. Geändert: 1, entfernt: 1, unverändert: 1.",
    );

    // Der Durchgang ist vorbei: „passt“ heißt jetzt nichts mehr.
    expect(await s.frage("passt")).toBe(DEMO_ANTWORT);
    expect(await s.frage("Wann ist Gitarrenunterricht?")).toContain(
      "keinen Termin",
    );
  });

  it("„Ablehnen“ lässt den Termin, wie er ist, und geht weiter", async () => {
    const s = neueSitzung();
    await s.frage(START);

    const karte = await s.karte("Dauert jetzt 2 Stunden");
    expect(karte.vorschau.daten).toContainEqual({
      label: "Neu",
      wert: "Samstag, 10. Oktober, 20:00 bis 22:00 Uhr",
    });
    expect(await s.entscheide(karte.id, "ablehnen")).toBe(
      `In Ordnung, „Training“ bleibt, wie es war.\n\n${FRAGE_2}`,
    );
  });

  it("fragt bei „nein“ nach und versteht dann einen neuen Wochentag", async () => {
    const s = neueSitzung();
    await s.frage(START);
    await s.frage("passt");

    expect(await s.frage("Nein")).toContain(
      "Was stimmt bei „Yoga“ nicht mehr?",
    );
    const karte = await s.karte("ab jetzt samstags");
    expect(karte.vorschau.daten).toContainEqual({
      label: "Neu",
      wert: "Samstag, 17. Oktober, 10:00 bis 11:00 Uhr",
    });
  });

  it("„Stopp“ beendet den Durchgang mit Zwischenstand", async () => {
    const s = neueSitzung();
    await s.frage(START);
    await s.frage("passt");

    expect(await s.frage("Stopp")).toBe(
      "In Ordnung, wir hören hier auf. Durchgegangen: 1 von 3. Geändert: 0, entfernt: 0. Mit „Lass uns meine festen Termine durchgehen“ fangen wir wieder vorn an.",
    );
    expect(await s.frage("passt")).toBe(DEMO_ANTWORT);
  });

  it("eine andere Frage unterbricht den Durchgang", async () => {
    const s = neueSitzung();
    await s.frage(START);

    expect(await s.frage("Was steht heute an?")).toContain(
      "Heute, Samstag, 10. Oktober",
    );
    expect(await s.frage("passt")).toBe(DEMO_ANTWORT);
  });
});
