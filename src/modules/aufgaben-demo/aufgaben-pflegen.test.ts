// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { WerkzeugKontext, WriteTool } from "../vertrag";
import { aufgabenDemo, type AufgabenAnzeigenErgebnis } from ".";

// Samstag, 10. Oktober 2026, 10:00 Uhr in Berlin
const jetzt = new Date("2026-10-10T08:00:00Z");
const ctx = (): WerkzeugKontext => ({ nutzerId: crypto.randomUUID(), jetzt });
const werkzeug = aufgabenDemo.tools;

async function anzeigen(c: WerkzeugKontext, eingabe: object = {}) {
  return (await werkzeug.aufgaben_anzeigen!.execute(
    werkzeug.aufgaben_anzeigen!.input.parse(eingabe),
    c,
  )) as AufgabenAnzeigenErgebnis;
}
async function aufgabe(c: WerkzeugKontext, titel: string) {
  const { aufgaben } = await anzeigen(c, { status: "alle" });
  return aufgaben.find((a) => a.titel === titel)!;
}
async function vorschau(c: WerkzeugKontext, name: string, eingabe: object) {
  const tool = werkzeug[name] as WriteTool;
  return tool.preview(tool.input.parse(eingabe), c);
}
async function ausfuehren(c: WerkzeugKontext, name: string, eingabe: object) {
  const tool = werkzeug[name] as WriteTool;
  return tool.execute(tool.input.parse(eingabe), c);
}

describe("Aufgaben pflegen: aufgabe_aendern", () => {
  it("verschiebt die Frist; die Karte zeigt Bisher und Neu", async () => {
    const c = ctx();
    const { id } = await aufgabe(c, "Paket zur Post bringen");

    const karte = await vorschau(c, "aufgabe_aendern", {
      id,
      frist: "2026-10-12",
    });
    expect(karte.titel).toBe("Aufgabe ändern");
    expect(karte.daten).toEqual([
      { label: "Was", wert: "Paket zur Post bringen" },
      { label: "Bisher", wert: "Frist Samstag, 10. Oktober" },
      { label: "Neu", wert: "Frist Montag, 12. Oktober" },
      { label: "Liste", wert: "Demo-Aufgaben, nur im Arbeitsspeicher" },
    ]);
    expect((await aufgabe(c, "Paket zur Post bringen")).frist).toBe(
      "2026-10-10",
    );

    await ausfuehren(c, "aufgabe_aendern", { id, frist: "2026-10-12" });
    expect((await aufgabe(c, "Paket zur Post bringen")).frist).toBe(
      "2026-10-12",
    );
  });

  it("entfernt die Frist mit null und ändert den Titel", async () => {
    const c = ctx();
    const { id } = await aufgabe(c, "Wasserfilter wechseln");

    const karte = await vorschau(c, "aufgabe_aendern", {
      id,
      frist: null,
      titel: "Wasserfilter kaufen",
    });
    expect(karte.daten).toContainEqual({
      label: "Neu",
      wert: "„Wasserfilter kaufen“, ohne Frist",
    });

    await ausfuehren(c, "aufgabe_aendern", {
      id,
      frist: null,
      titel: "Wasserfilter kaufen",
    });
    const neu = await aufgabe(c, "Wasserfilter kaufen");
    expect(neu.frist).toBeUndefined();
  });

  it("verlangt eine wirksame Änderung an einer offenen Aufgabe", async () => {
    const c = ctx();
    const { id } = await aufgabe(c, "Paket zur Post bringen");

    await expect(vorschau(c, "aufgabe_aendern", { id })).rejects.toThrow(
      "Sag mir, was sich ändern soll: Titel oder Frist.",
    );
    await expect(
      vorschau(c, "aufgabe_aendern", { id, frist: "2026-10-10" }),
    ).rejects.toThrow("ändert sich damit nichts");
    await expect(
      vorschau(c, "aufgabe_aendern", { id: "gibt-es-nicht", frist: null }),
    ).rejects.toThrow("Diese Aufgabe gibt es nicht.");

    await ausfuehren(c, "aufgabe_erledigen", { id });
    await expect(
      vorschau(c, "aufgabe_aendern", { id, frist: null }),
    ).rejects.toThrow("ist schon erledigt");
  });
});

describe("Aufgaben pflegen: löschen, wieder öffnen, erledigte anzeigen", () => {
  it("löscht offene und erledigte Aufgaben", async () => {
    const c = ctx();
    const { id } = await aufgabe(c, "Urlaubsfotos sortieren");

    const karte = await vorschau(c, "aufgabe_loeschen", { id });
    expect(karte.titel).toBe("Aufgabe löschen");
    expect(karte.daten).toContainEqual({ label: "Stand", wert: "offen" });

    await ausfuehren(c, "aufgabe_loeschen", { id });
    expect(await aufgabe(c, "Urlaubsfotos sortieren")).toBeUndefined();
    await expect(vorschau(c, "aufgabe_loeschen", { id })).rejects.toThrow(
      "Diese Aufgabe gibt es nicht.",
    );
  });

  it("öffnet nur erledigte Aufgaben wieder", async () => {
    const c = ctx();
    const { id } = await aufgabe(c, "Paket zur Post bringen");

    await expect(vorschau(c, "aufgabe_wieder_oeffnen", { id })).rejects.toThrow(
      "„Paket zur Post bringen“ ist noch offen.",
    );

    await ausfuehren(c, "aufgabe_erledigen", { id });
    expect((await vorschau(c, "aufgabe_wieder_oeffnen", { id })).titel).toBe(
      "Aufgabe wieder öffnen",
    );
    await ausfuehren(c, "aufgabe_wieder_oeffnen", { id });
    expect((await aufgabe(c, "Paket zur Post bringen")).erledigt).toBe(false);
  });

  it("zeigt offene (Standard), erledigte oder alle", async () => {
    const c = ctx();
    const { id } = await aufgabe(c, "Paket zur Post bringen");
    await ausfuehren(c, "aufgabe_erledigen", { id });

    expect((await anzeigen(c)).aufgaben).toHaveLength(3);
    const erledigt = await anzeigen(c, { status: "erledigt" });
    expect(erledigt.status).toBe("erledigt");
    expect(erledigt.aufgaben.map((a) => a.titel)).toEqual([
      "Paket zur Post bringen",
    ]);
    expect((await anzeigen(c, { status: "alle" })).aufgaben).toHaveLength(4);
  });
});
