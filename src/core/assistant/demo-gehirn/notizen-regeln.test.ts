// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aktionenImArbeitsspeicher } from "@/core/guard/aktionen";
import { erstelleSchutzschicht } from "@/core/guard/schutzschicht";
import { findeWerkzeug, werkzeuge } from "@/modules/registry";
import { erstelleChat } from "../chat";
import { gespraecheImArbeitsspeicher } from "../gespraeche";
import { erstelleDemoGehirn } from ".";

// Integration: Demo-Notizen vom Satz bis zur Ablage.
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

describe("Notizen im Chat", () => {
  it("„Notiz: …“ legt den Text unverändert an, nach Freigabe", async () => {
    const s = neueSitzung();

    const karte = await s.karte(
      "Notiz: Zahnarzt fragen, ob 10 Uhr auch freitags geht – trag nichts ein!",
    );
    expect(karte.vorschau.titel).toBe("Notiz anlegen");
    expect(await s.entscheide(karte.id, "freigeben")).toBe(
      "Notiert: „Zahnarzt fragen, ob 10 Uhr auch freitags geht – trag nichts ein!“ liegt jetzt in deinen Demo-Notizen.",
    );
    expect(await s.frage("Meine Notizen")).toBe(
      [
        "Du hast 3 Demo-Notizen, die neueste zuerst:",
        "• Zahnarzt fragen, ob 10 Uhr auch freitags geht – trag nichts ein!",
        "• Idee: Kräuter auf dem Balkon pflanzen",
        "• Geschenkidee für Mama: Kochbuch mit Pasta-Rezepten",
      ].join("\n"),
    );
  });

  for (const satz of [
    "Neue Notiz: Fahrradschloss kaufen",
    "Mach mir eine Notiz: Fahrradschloss kaufen",
    "Schreib dir auf: Fahrradschloss kaufen",
  ]) {
    it(`„${satz}“`, async () => {
      const karte = await neueSitzung().karte(satz);
      expect(karte.vorschau.daten[0]).toEqual({
        label: "Notiz",
        wert: "Fahrradschloss kaufen",
      });
    });
  }

  it("„Notizen zu Kochbuch“ sucht, „Ablehnen“ legt nichts an", async () => {
    const s = neueSitzung();
    expect(await s.frage("Notizen zu Kochbuch")).toBe(
      "Zu „Kochbuch“ finde ich 1 Demo-Notiz:\n• Geschenkidee für Mama: Kochbuch mit Pasta-Rezepten",
    );

    const karte = await s.karte("Notiz: wird abgelehnt");
    expect(await s.entscheide(karte.id, "ablehnen")).toBe(
      "In Ordnung, ich habe nichts notiert.",
    );
    expect(await s.frage("Meine Notizen")).not.toContain("abgelehnt");
  });

  it("„Lösch die Notiz Kochbuch“ in zwei Schritten", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Lösch die Notiz Kochbuch");
    expect(karte.vorschau.titel).toBe("Notiz löschen");
    expect(await s.entscheide(karte.id, "freigeben")).toBe(
      "Gelöscht: Die Notiz „Geschenkidee für Mama: Kochbuch mit Pasta-Rezepten“ ist weg.",
    );
    expect(await s.frage("Lösch die Notiz Kochbuch")).toBe(
      "Zu „Kochbuch“ finde ich keine Demo-Notiz. Mit „Meine Notizen“ zeige ich dir alle.",
    );
  });

  it("fragt nach, wenn Text oder Notiz fehlen, und lässt Termine in Ruhe", async () => {
    const s = neueSitzung();
    expect(await s.frage("Notiz:")).toContain("Was soll ich notieren?");
    expect(await s.frage("Lösch die Notiz")).toContain(
      "Welche Notiz soll ich löschen?",
    );
    expect(
      (await s.karte("Notier Zahnarzt Freitag 10 Uhr")).vorschau.titel,
    ).toBe("Termin anlegen");
  });
});
