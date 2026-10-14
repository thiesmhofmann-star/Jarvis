// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aktionenImArbeitsspeicher } from "@/core/guard/aktionen";
import { erstelleSchutzschicht } from "@/core/guard/schutzschicht";
import { findeWerkzeug, werkzeuge } from "@/modules/registry";
import { erstelleChat } from "../chat";
import { gespraecheImArbeitsspeicher } from "../gespraeche";
import { erstelleDemoGehirn } from ".";

// Integration: aus einer Demo-Mail eine Aufgabe oder einen Termin machen.
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

const zeilen = (aktion: { vorschau: { daten: unknown[] } }) =>
  aktion.vorschau.daten as { label: string; wert: string }[];

describe("Aus Mails übernehmen", () => {
  it("„Mach aus der Mail von Lena eine Aufgabe“: Frist aus „bis Freitag“, Mail als Quelle", async () => {
    const s = neueSitzung();
    const aktion = await s.karte("Mach aus der Mail von Lena eine Aufgabe");

    expect(aktion.vorschau.titel).toBe("Aufgabe anlegen");
    expect(zeilen(aktion)).toEqual([
      { label: "Was", wert: "Unterlagen für Montag" },
      { label: "Frist", wert: "Freitag, 16. Oktober" },
      {
        label: "Quelle",
        wert: "Mail von Lena Berger: „Unterlagen für Montag“",
      },
      { label: "Liste", wert: "Demo-Aufgaben, nur im Arbeitsspeicher" },
    ]);

    expect(await s.entscheide(aktion.id, "freigeben")).toBe(
      "Notiert: „Unterlagen für Montag“ steht jetzt auf deiner Demo-Aufgabenliste, fällig am Freitag, 16. Oktober (aus der Mail von Lena Berger).",
    );
    expect(await s.frage("Was ist bis Freitag fällig?")).toContain(
      "Unterlagen für Montag",
    );
  });

  it("findet kein Datum in der Mail der Bibliothek und fragt nach", async () => {
    const s = neueSitzung();
    const antwort = await s.frage(
      "Mach aus der Mail von der Bibliothek eine Aufgabe",
    );

    expect(antwort).toBe(
      "In der Mail von Stadtbibliothek finde ich kein Datum. Bis wann soll „Leihfrist abgelaufen“ erledigt sein? Sag es mir zum Beispiel so: „Mach aus der Mail von Bibliothek eine Aufgabe bis Freitag“, oder „… eine Aufgabe ohne Frist“.",
    );

    const mitFrist = await s.karte(
      "Mach aus der Mail von der Bibliothek eine Aufgabe bis Dienstag",
    );
    expect(zeilen(mitFrist)).toContainEqual({
      label: "Frist",
      wert: "Dienstag, 13. Oktober",
    });
    expect(zeilen(mitFrist)).toContainEqual({
      label: "Quelle",
      wert: "Mail von Stadtbibliothek: „Erinnerung: Leihfrist abgelaufen“",
    });
  });

  it("„… eine Aufgabe ohne Frist“ legt sie ohne Frist an", async () => {
    const s = neueSitzung();
    const aktion = await s.karte(
      "Mach aus der Mail von der Bibliothek eine Aufgabe ohne Frist",
    );

    expect(zeilen(aktion)).toContainEqual({
      label: "Frist",
      wert: "keine",
    });
    expect(await s.entscheide(aktion.id, "freigeben")).toBe(
      "Notiert: „Leihfrist abgelaufen“ steht jetzt auf deiner Demo-Aufgabenliste, ohne Frist (aus der Mail von Stadtbibliothek).",
    );
  });

  it("„Trag den Termin aus der Mail der Hausverwaltung ein“: Tag, Uhrzeit und Dauer aus dem Text", async () => {
    const s = neueSitzung();
    const aktion = await s.karte(
      "Trag den Termin aus der Mail der Hausverwaltung ein",
    );

    expect(aktion.vorschau.titel).toBe("Termin anlegen");
    expect(zeilen(aktion)).toEqual([
      { label: "Was", wert: "Wartung der Heizung" },
      { label: "Wann", wert: "Donnerstag, 15. Oktober, 08:00 Uhr" },
      { label: "Dauer", wert: "240 Minuten" },
      {
        label: "Quelle",
        wert: "Mail von Hausverwaltung Sonnenhof: „Wartung der Heizung am Donnerstag“",
      },
      { label: "Kalender", wert: "Demo-Kalender (nur im Arbeitsspeicher)" },
    ]);

    expect(await s.entscheide(aktion.id, "freigeben")).toBe(
      "Erledigt: „Wartung der Heizung“ steht jetzt am Donnerstag, 15. Oktober, um 08:00 Uhr im Demo-Kalender (aus der Mail von Hausverwaltung Sonnenhof).",
    );
    expect(await s.frage("Was steht Donnerstag an?")).toContain(
      "Wartung der Heizung",
    );
  });

  it("übernimmt den Kontrolltermin der Praxis mit Datum und Uhrzeit", async () => {
    const aktion = await neueSitzung().karte(
      "Trag den Termin aus der Mail von der Praxis ein",
    );

    expect(zeilen(aktion).slice(0, 3)).toEqual([
      { label: "Was", wert: "Kontrolltermin" },
      { label: "Wann", wert: "Samstag, 24. Oktober, 09:30 Uhr" },
      { label: "Dauer", wert: "60 Minuten" },
    ]);
  });

  it("eine selbst genannte Uhrzeit hat Vorrang vor dem Mailtext", async () => {
    const aktion = await neueSitzung().karte(
      "Trag den Termin aus der Mail der Hausverwaltung um 9 Uhr ein",
    );

    expect(zeilen(aktion)).toContainEqual({
      label: "Wann",
      wert: "Donnerstag, 15. Oktober, 09:00 Uhr",
    });
    // Ohne Ende aus der Mail bleibt die übliche Stunde.
    expect(zeilen(aktion)).toContainEqual({
      label: "Dauer",
      wert: "60 Minuten",
    });
  });

  it("fragt nach, wenn in der Mail eine Uhrzeit fehlt", async () => {
    expect(
      await neueSitzung().frage(
        "Trag den Termin aus der Mail vom Fahrradladen ein",
      ),
    ).toBe(
      "In der Mail von Fahrradladen Speiche finde ich keine Uhrzeit. Sag es mir dazu, zum Beispiel „Trag den Termin aus der Mail von Fahrradladen am Donnerstag um 8 Uhr ein“.",
    );
  });

  it("Ablehnen übernimmt nichts", async () => {
    const s = neueSitzung();
    const aktion = await s.karte("Mach aus Lenas Mail eine Aufgabe");

    expect(await s.entscheide(aktion.id, "ablehnen")).toBe(
      "In Ordnung, ich habe nichts übernommen.",
    );
    expect(await s.frage("Was ist bis Freitag fällig?")).not.toContain(
      "Unterlagen für Montag",
    );
  });

  it("unbekannter Absender und fehlender Absender", async () => {
    const s = neueSitzung();
    expect(
      await s.frage("Mach aus der Mail von Herrn Niemand eine Aufgabe"),
    ).toContain("Herrn Niemand");
    expect(await s.frage("Mach aus der Mail eine Aufgabe")).toBe(
      "Aus welcher Mail? Sag es mir zum Beispiel so: „Mach aus der Mail von Lena eine Aufgabe“.",
    );
  });

  it("„Neue Aufgabe: Mail an Lena schreiben“ bleibt eine gewöhnliche Aufgabe", async () => {
    const aktion = await neueSitzung().karte(
      "Neue Aufgabe: Mail an Lena schreiben",
    );

    expect(aktion.vorschau.titel).toBe("Aufgabe anlegen");
    expect(zeilen(aktion).map((z) => z.label)).not.toContain("Quelle");
  });
});
