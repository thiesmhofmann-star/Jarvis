// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { WerkzeugKontext, WriteTool } from "../vertrag";
import { aufgabenDemo, type AufgabenAnzeigenErgebnis } from ".";

// Samstag, 10. Oktober 2026, 10:00 Uhr in Berlin
const jetzt = new Date("2026-10-10T08:00:00Z");
const ctx = (): WerkzeugKontext => ({ nutzerId: crypto.randomUUID(), jetzt });

const { aufgaben_anzeigen, aufgabe_anlegen, aufgabe_erledigen } =
  aufgabenDemo.tools;

async function anzeigen(c: WerkzeugKontext, faelligBis?: string) {
  const eingabe = aufgaben_anzeigen!.input.parse(
    faelligBis ? { faelligBis } : {},
  );
  return (await aufgaben_anzeigen!.execute(
    eingabe,
    c,
  )) as AufgabenAnzeigenErgebnis;
}

async function anlegen(c: WerkzeugKontext, titel: string, frist?: string) {
  const eingabe = aufgabe_anlegen!.input.parse(
    frist ? { titel, frist } : { titel },
  );
  return aufgabe_anlegen!.execute(eingabe, c);
}

const erledigen = aufgabe_erledigen as WriteTool;

describe("Modul Aufgaben & Fristen (Demo)", () => {
  it("startet mit vier erfundenen Aufgaben, nach Frist sortiert, ohne Frist am Ende", async () => {
    const { faelligBis, aufgaben } = await anzeigen(ctx());

    expect(faelligBis).toBeNull();
    expect(
      aufgaben.map((a) => [a.titel, a.frist ?? null, a.ueberfaellig]),
    ).toEqual([
      ["Bibliotheksbuch zurückgeben", "2026-10-08", true],
      ["Paket zur Post bringen", "2026-10-10", false],
      ["Wasserfilter wechseln", "2026-10-13", false],
      ["Urlaubsfotos sortieren", null, false],
    ]);
    expect(aufgaben.every((a) => a.demo && !a.erledigt)).toBe(true);
  });

  it("zeigt mit „fällig bis“ nur Aufgaben bis einschließlich diesem Tag, Überfälliges zuerst", async () => {
    const c = ctx();
    await anlegen(c, "Steuererklärung abgeben", "2026-10-11");

    const { faelligBis, aufgaben } = await anzeigen(c, "2026-10-11");

    expect(faelligBis).toBe("2026-10-11");
    expect(aufgaben.map((a) => a.titel)).toEqual([
      "Bibliotheksbuch zurückgeben",
      "Paket zur Post bringen",
      "Steuererklärung abgeben",
    ]);
  });

  it("prüft beim Anlegen die Eingabe", () => {
    expect(aufgabe_anlegen!.input.safeParse({ titel: "" }).success).toBe(false);
    expect(
      aufgabe_anlegen!.input.safeParse({ titel: "a".repeat(101) }).success,
    ).toBe(false);
    expect(
      aufgabe_anlegen!.input.safeParse({ titel: "Steuer", frist: "Freitag" })
        .success,
    ).toBe(false);
    expect(
      aufgabe_anlegen!.input.safeParse({ titel: "Fahrrad aufpumpen" }).success,
    ).toBe(true);
  });

  it("zeigt in der Vorschau Was, Frist und Liste", async () => {
    const vorschau = await (aufgabe_anlegen as WriteTool).preview(
      { titel: "Steuererklärung abgeben", frist: "2026-10-16" },
      ctx(),
    );

    expect(vorschau.titel).toBe("Aufgabe anlegen");
    expect(vorschau.daten).toEqual([
      { label: "Was", wert: "Steuererklärung abgeben" },
      { label: "Frist", wert: "Freitag, 16. Oktober" },
      { label: "Liste", wert: "Demo-Aufgaben, nur im Arbeitsspeicher" },
    ]);
  });

  it("hakt eine Aufgabe ab; danach ist sie nicht mehr offen", async () => {
    const c = ctx();
    const [buch] = (await anzeigen(c)).aufgaben;

    const vorschau = await erledigen.preview({ id: buch!.id }, c);
    expect(vorschau).toMatchObject({ titel: "Aufgabe abhaken" });
    expect(vorschau.daten[0]).toEqual({
      label: "Was",
      wert: "Bibliotheksbuch zurückgeben",
    });
    await erledigen.execute({ id: buch!.id }, c);

    expect((await anzeigen(c)).aufgaben.map((a) => a.titel)).not.toContain(
      "Bibliotheksbuch zurückgeben",
    );
  });

  it("meldet unbekannte und schon erledigte Aufgaben verständlich", async () => {
    const c = ctx();
    const [buch] = (await anzeigen(c)).aufgaben;

    await expect(erledigen.preview({ id: "gibt-es-nicht" }, c)).rejects.toThrow(
      "Diese Aufgabe gibt es nicht.",
    );
    await erledigen.execute({ id: buch!.id }, c);
    await expect(erledigen.preview({ id: buch!.id }, c)).rejects.toThrow(
      "„Bibliotheksbuch zurückgeben“ ist schon erledigt.",
    );
    await expect(erledigen.execute({ id: buch!.id }, c)).rejects.toThrow(
      /schon erledigt/,
    );
  });

  it("trennt die Listen verschiedener Sitzungen", async () => {
    const a = ctx();
    await anlegen(a, "Nur für A");

    expect((await anzeigen(ctx())).aufgaben.map((x) => x.titel)).not.toContain(
      "Nur für A",
    );
  });
});
