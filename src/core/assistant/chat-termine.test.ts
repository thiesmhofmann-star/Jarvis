// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aktionenImArbeitsspeicher } from "@/core/guard/aktionen";
import { erstelleSchutzschicht } from "@/core/guard/schutzschicht";
import { findeWerkzeug, werkzeuge } from "@/modules/registry";
import { erstelleChat } from "./chat";
import { erstelleDemoGehirn } from "./demo-gehirn";
import type { ChatEintrag } from "./eintraege";
import { gespraecheImArbeitsspeicher } from "./gespraeche";

// Integration: Termine ändern, absagen und Dauertermine, vom Satz bis zum Demo-Kalender.
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

  const text = (eintraege: ChatEintrag[]) =>
    eintraege.map((e) => (e.art === "jarvis" ? e.text : "")).join("\n");

  return {
    /** Antwort von Jarvis als Text */
    frage: async (satz: string) => text(await chat.sende(satz, c)),
    /** Erwartet eine Freigabe-Karte und liefert sie */
    karte: async (satz: string) => {
      const eintraege = await chat.sende(satz, c);
      const karte = eintraege.find((e) => e.art === "freigabe");
      if (karte?.art !== "freigabe") {
        throw new Error(
          `Freigabe-Karte erwartet, bekommen: ${text(eintraege)}`,
        );
      }
      return karte.aktion;
    },
    entscheide: async (id: string, wahl: "freigeben" | "ablehnen") => {
      const ergebnis = await chat.entscheide(id, wahl, c);
      if (ergebnis.art !== "ok") throw new Error(ergebnis.meldung);
      return { status: ergebnis.aktion.status, text: text(ergebnis.eintraege) };
    },
  };
}

describe("Termine ändern im Chat", () => {
  it("„Verschieb Laufen im Park auf 19 Uhr“: Karte, Freigeben, danach die neue Zeit", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Verschieb Laufen im Park auf 19 Uhr");
    expect(karte.vorschau.titel).toBe("Termin ändern");
    expect(karte.vorschau.daten).toEqual([
      { label: "Was", wert: "Laufen im Park" },
      { label: "Bisher", wert: "Samstag, 10. Oktober, 18:00 bis 19:00 Uhr" },
      { label: "Neu", wert: "Samstag, 10. Oktober, 19:00 bis 20:00 Uhr" },
      { label: "Kalender", wert: "Demo-Kalender (nur im Arbeitsspeicher)" },
    ]);

    const { text } = await s.entscheide(karte.id, "freigeben");
    expect(text).toBe(
      "Erledigt: „Laufen im Park“ steht jetzt am Samstag, 10. Oktober, um 19:00 Uhr im Demo-Kalender.",
    );
    expect(await s.frage("Was steht heute an?")).toContain(
      "19:00–20:00 Uhr: Laufen im Park",
    );
  });

  it("„Training ist ab jetzt immer um 19 Uhr“: ab heute jede Woche, frühere bleiben", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Training ist ab jetzt immer um 19 Uhr");
    expect(karte.vorschau.daten).toContainEqual({
      label: "Gilt für",
      wert: "Ab Samstag, 10. Oktober jede Woche",
    });
    expect(karte.vorschau.daten).toContainEqual({
      label: "Neu",
      wert: "Samstag, 10. Oktober, 19:00 bis 20:30 Uhr",
    });

    const { text } = await s.entscheide(karte.id, "freigeben");
    expect(text).toBe(
      "Erledigt: „Training“ steht ab Samstag, 10. Oktober, jede Woche um 19:00 Uhr im Demo-Kalender. Frühere Termine bleiben, wie sie waren.",
    );
    const liste = await s.frage("Wann ist Training?");
    expect(liste).toContain("5 Termine zu „Training“");
    expect(liste).not.toContain("20:00");
    expect(liste).toContain(
      "• Samstag, 31. Oktober, 19:00–20:30 Uhr: Training",
    );
  });

  it("„Verschieb Laufen im Park auf Montag“: nur der Tag ändert sich, die Uhrzeit bleibt", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Verschieb Laufen im Park auf Montag");
    expect(karte.vorschau.daten).toContainEqual({
      label: "Neu",
      wert: "Montag, 12. Oktober, 18:00 bis 19:00 Uhr",
    });
  });

  it("„Ablehnen“ ändert nichts", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Training ist ab jetzt immer um 19 Uhr");
    const { status, text } = await s.entscheide(karte.id, "ablehnen");
    expect(status).toBe("abgelehnt");
    expect(text).toBe("In Ordnung, der Termin bleibt, wie er war.");
    expect(await s.frage("Was steht heute an?")).toContain(
      "20:00–21:30 Uhr: Training",
    );
  });

  it("„Verschieb Fliegen lernen auf 10 Uhr“: freundliche Antwort, keine Karte", async () => {
    const s = neueSitzung();

    expect(await s.frage("Verschieb Fliegen lernen auf 10 Uhr")).toBe(
      "Im Demo-Kalender finde ich bis Montag, 9. November, keinen Termin zu „Fliegen lernen“. Mit „Wann ist …?“ suche ich in den nächsten 30 Tagen.",
    );
  });

  it("fragt nach, wenn verschiedene Titel passen, und nennt sie", async () => {
    const s = neueSitzung();
    for (const satz of [
      "Trag Zahnarzt Kontrolle Montag 9 Uhr ein",
      "Trag Zahnarzt Reinigung Dienstag 9 Uhr ein",
    ]) {
      await s.entscheide((await s.karte(satz)).id, "freigeben");
    }

    expect(await s.frage("Verschieb Zahnarzt auf 11 Uhr")).toBe(
      "Dazu passen mehrere Termine: „Zahnarzt Kontrolle“ (Montag, 12. Oktober), „Zahnarzt Reinigung“ (Dienstag, 13. Oktober). Welchen meinst du? Nenn mir bitte den ganzen Titel.",
    );
  });
});

describe("Termine absagen im Chat", () => {
  it("„Training fällt nächste Woche aus“: nur dieses Vorkommen fehlt", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Training fällt nächste Woche aus");
    expect(karte.vorschau.titel).toBe("Termin absagen");
    expect(karte.vorschau.daten).toContainEqual({
      label: "Fällt weg",
      wert: "Nur am Samstag, 17. Oktober",
    });

    const { text } = await s.entscheide(karte.id, "freigeben");
    expect(text).toBe(
      "Erledigt: „Training“ fällt am Samstag, 17. Oktober, aus. In den anderen Wochen bleibt der Termin im Demo-Kalender.",
    );
    const liste = await s.frage("Wann ist Training?");
    expect(liste).not.toContain("17. Oktober");
    expect(liste).toContain("Samstag, 10. Oktober");
    expect(liste).toContain("Samstag, 24. Oktober");
  });

  it("„Sag Training am Samstag ab“: heute fällt weg, die Woche darauf ist wieder da", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Sag Training am Samstag ab");
    expect(karte.vorschau.daten).toContainEqual({
      label: "Fällt weg",
      wert: "Nur am Samstag, 10. Oktober",
    });
    await s.entscheide(karte.id, "freigeben");

    expect(await s.frage("Was steht heute an?")).not.toContain("Training");
    expect(await s.frage("Wann ist Training?")).toContain(
      "• Samstag, 17. Oktober, 20:00–21:30 Uhr: Training",
    );
  });

  it("sagt einen Einzeltermin ab, ohne Benachrichtigung zu versprechen", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Lösche Laufen im Park");
    expect(karte.vorschau.beschreibung).toContain("benachrichtigt niemanden");
    const { text } = await s.entscheide(karte.id, "freigeben");
    expect(text).toBe(
      "Erledigt: „Laufen im Park“ am Samstag, 10. Oktober, ist aus dem Demo-Kalender entfernt.",
    );
    expect(await s.frage("Was steht heute an?")).not.toContain("Laufen");
  });

  it("„Ablehnen“ lässt den Termin stehen", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Training fällt nächste Woche aus");
    const { text } = await s.entscheide(karte.id, "ablehnen");
    expect(text).toBe("In Ordnung, der Termin bleibt im Demo-Kalender.");
    expect(await s.frage("Wann ist Training?")).toContain("17. Oktober");
  });
});

describe("Dauertermine anlegen im Chat", () => {
  it("„Trag jeden Mittwoch 20 Uhr Chorprobe ein“: erscheint an den nächsten Mittwochen", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Trag jeden Mittwoch 20 Uhr Chorprobe ein");
    expect(karte.vorschau.titel).toBe("Dauertermin anlegen");
    expect(karte.vorschau.daten).toContainEqual({
      label: "Wiederholung",
      wert: "Jede Woche am Mittwoch",
    });

    const { text } = await s.entscheide(karte.id, "freigeben");
    expect(text).toBe(
      "Erledigt: „Chorprobe“ steht jetzt jede Woche am Mittwoch um 20:00 Uhr im Demo-Kalender, zum ersten Mal am Mittwoch, 14. Oktober.",
    );
    const liste = await s.frage("Wann ist Chorprobe?");
    for (const tag of [
      "14. Oktober",
      "21. Oktober",
      "28. Oktober",
      "4. November",
    ]) {
      expect(liste).toContain(`• Mittwoch, ${tag}, 20:00–21:00 Uhr: Chorprobe`);
    }
  });
});
