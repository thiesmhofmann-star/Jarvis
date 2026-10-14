// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aktionenImArbeitsspeicher } from "@/core/guard/aktionen";
import { erstelleSchutzschicht } from "@/core/guard/schutzschicht";
import { findeWerkzeug, werkzeuge } from "@/modules/registry";
import { erstelleChat } from "../chat";
import { gespraecheImArbeitsspeicher } from "../gespraeche";
import { erstelleDemoGehirn } from ".";

// Integration: Aufgaben pflegen vom Satz bis zur Demo-Liste.
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

describe("Aufgaben pflegen im Chat", () => {
  it("„Paket zur Post hat Zeit bis Montag“: neue Frist nach Freigabe", async () => {
    const s = neueSitzung();

    const karte = await s.karte("Paket zur Post hat Zeit bis Montag");
    expect(karte.vorschau.titel).toBe("Aufgabe ändern");
    expect(karte.vorschau.daten).toContainEqual({
      label: "Neu",
      wert: "Frist Montag, 12. Oktober",
    });
    expect(await s.entscheide(karte.id, "freigeben")).toBe(
      "Geändert: „Paket zur Post bringen“ ist jetzt fällig am Montag, 12. Oktober.",
    );
    expect(await s.frage("Was ist bis heute fällig?")).not.toContain("Paket");
  });

  it("„Verschieb die Frist für Wasserfilter auf den 20.10.“ und „… hat keine Frist mehr“", async () => {
    const s = neueSitzung();

    const verschieben = await s.karte(
      "Verschieb die Frist für Wasserfilter auf den 20.10.",
    );
    expect(verschieben.vorschau.daten).toContainEqual({
      label: "Neu",
      wert: "Frist Dienstag, 20. Oktober",
    });
    await s.entscheide(verschieben.id, "freigeben");

    const ohne = await s.karte("Wasserfilter hat keine Frist mehr");
    expect(await s.entscheide(ohne.id, "freigeben")).toBe(
      "Geändert: „Wasserfilter wechseln“ hat jetzt keine Frist mehr.",
    );
    expect(await s.frage("Meine Aufgaben")).toContain(
      "Wasserfilter wechseln – ohne Frist",
    );
  });

  it("„Benenne die Aufgabe Urlaubsfotos um in Fotobuch gestalten“", async () => {
    const s = neueSitzung();

    const karte = await s.karte(
      "Benenne die Aufgabe Urlaubsfotos um in Fotobuch gestalten",
    );
    expect(await s.entscheide(karte.id, "freigeben")).toBe(
      "Geändert: „Urlaubsfotos sortieren“ heißt jetzt „Fotobuch gestalten“.",
    );
  });

  it("„Lösch die Aufgabe Urlaubsfotos“: weg nach Freigabe, bleibt nach Ablehnen", async () => {
    const s = neueSitzung();

    const abgelehnt = await s.karte("Lösch die Aufgabe Urlaubsfotos");
    expect(abgelehnt.vorschau.titel).toBe("Aufgabe löschen");
    expect(await s.entscheide(abgelehnt.id, "ablehnen")).toBe(
      "In Ordnung, die Aufgabe bleibt auf der Liste.",
    );
    expect(await s.frage("Meine Aufgaben")).toContain("Urlaubsfotos");

    const karte = await s.karte("Lösch die Aufgabe Urlaubsfotos");
    expect(await s.entscheide(karte.id, "freigeben")).toBe(
      "Gelöscht: „Urlaubsfotos sortieren“ steht nicht mehr auf deiner Demo-Aufgabenliste.",
    );
    expect(await s.frage("Meine Aufgaben")).not.toContain("Urlaubsfotos");
  });

  it("abhaken, „Was habe ich erledigt?“, „… ist doch nicht erledigt“", async () => {
    const s = neueSitzung();
    expect(await s.frage("Was habe ich erledigt?")).toBe(
      "Du hast noch keine Demo-Aufgabe abgehakt.",
    );

    await s.entscheide((await s.karte("Paket ist erledigt")).id, "freigeben");
    expect(await s.frage("Was habe ich erledigt?")).toBe(
      "Erledigt hast du 1 Demo-Aufgabe:\n• Paket zur Post bringen",
    );

    const karte = await s.karte("Paket ist doch nicht erledigt");
    expect(karte.vorschau.titel).toBe("Aufgabe wieder öffnen");
    expect(await s.entscheide(karte.id, "freigeben")).toBe(
      "Wieder offen: „Paket zur Post bringen“ steht wieder auf deiner Demo-Aufgabenliste.",
    );
    expect(await s.frage("Meine Aufgaben")).toContain("Paket zur Post bringen");
  });

  it("antwortet freundlich, wenn nichts passt", async () => {
    const s = neueSitzung();

    expect(await s.frage("Fliegen lernen hat Zeit bis Montag")).toBe(
      "Ich finde keine offene Demo-Aufgabe zu „Fliegen lernen“. Mit „Meine Aufgaben“ zeige ich dir alle offenen.",
    );
    expect(await s.frage("Paket ist doch nicht erledigt")).toContain(
      "Ich finde keine erledigte Demo-Aufgabe zu „Paket“.",
    );
  });

  it("lässt die bisherigen Sätze in Ruhe", async () => {
    const s = neueSitzung();

    expect(
      (await s.karte("Neue Aufgabe: Frist für Steuer klären bis Freitag"))
        .vorschau.titel,
    ).toBe("Aufgabe anlegen");
    expect((await s.karte("Lösch Laufen im Park")).vorschau.titel).toBe(
      "Termin absagen",
    );
    expect(await s.frage("Was ist noch nicht erledigt?")).not.toContain(
      "wieder",
    );
  });
});
