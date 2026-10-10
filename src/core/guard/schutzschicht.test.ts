// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { RegistriertesWerkzeug } from "@/modules/registry";
import { aktionenImArbeitsspeicher } from "./aktionen";
import { erstelleSchutzschicht } from "./schutzschicht";

const ctx = { nutzerId: "nutzer-a", jetzt: new Date("2026-10-10T08:00:00Z") };

function aufbau() {
  const kalender: string[] = [];
  const schreiben = vi.fn(async ({ titel }: { titel: string }) => {
    kalender.push(titel);
    return { titel };
  });
  const lesen = vi.fn(async () => [...kalender]);
  const verzeichnis: RegistriertesWerkzeug[] = [
    {
      name: "lesen",
      modulId: "test",
      werkzeug: {
        description: "",
        effect: "read",
        input: z.object({}),
        execute: lesen,
      },
    },
    {
      name: "schreiben",
      modulId: "test",
      werkzeug: {
        description: "",
        effect: "write",
        input: z.object({ titel: z.string().min(1) }),
        execute: schreiben,
        preview: async ({ titel }) => ({
          titel: "Eintragen",
          beschreibung: "Trägt etwas ein.",
          daten: [{ label: "Was", wert: titel }],
        }),
      },
    },
  ];
  const schutzschicht = erstelleSchutzschicht({
    findeWerkzeug: (name) => verzeichnis.find((w) => w.name === name),
    speicher: aktionenImArbeitsspeicher(),
  });
  return { schutzschicht, schreiben, lesen, kalender };
}

describe("Schutzschicht", () => {
  let t: ReturnType<typeof aufbau>;
  beforeEach(() => {
    t = aufbau();
  });

  it("führt Lese-Werkzeuge direkt aus", async () => {
    const ergebnis = await t.schutzschicht.aufrufen("lesen", {}, ctx);

    expect(ergebnis).toEqual({ art: "ergebnis", ergebnis: [] });
    expect(t.lesen).toHaveBeenCalledOnce();
  });

  it("führt ein Schreib-Werkzeug ohne Freigabe niemals aus", async () => {
    const ergebnis = await t.schutzschicht.aufrufen(
      "schreiben",
      { titel: "Zahnarzt" },
      ctx,
    );

    expect(ergebnis.art).toBe("freigabe");
    if (ergebnis.art !== "freigabe") return;
    expect(ergebnis.aktion.status).toBe("offen");
    expect(ergebnis.aktion.vorschau.daten).toEqual([
      { label: "Was", wert: "Zahnarzt" },
    ]);
    expect(t.schreiben).not.toHaveBeenCalled();
    expect(t.kalender).toEqual([]);
  });

  it("„Ablehnen“ ändert nichts", async () => {
    const vorschlag = await t.schutzschicht.aufrufen(
      "schreiben",
      { titel: "Zahnarzt" },
      ctx,
    );
    if (vorschlag.art !== "freigabe") throw new Error("Freigabe erwartet");

    const entscheidung = await t.schutzschicht.entscheiden(
      vorschlag.aktion.id,
      "ablehnen",
      ctx,
    );

    expect(entscheidung.art).toBe("abgelehnt");
    expect(t.schreiben).not.toHaveBeenCalled();
    expect(t.kalender).toEqual([]);
    // Eine abgelehnte Aktion lässt sich nicht nachträglich freigeben.
    const spaeter = await t.schutzschicht.entscheiden(
      vorschlag.aktion.id,
      "freigeben",
      ctx,
    );
    expect(spaeter).toMatchObject({ art: "fehler", grund: "entschieden" });
    expect(t.schreiben).not.toHaveBeenCalled();
  });

  it("führt nach „Freigeben“ genau einmal aus", async () => {
    const vorschlag = await t.schutzschicht.aufrufen(
      "schreiben",
      { titel: "Zahnarzt" },
      ctx,
    );
    if (vorschlag.art !== "freigabe") throw new Error("Freigabe erwartet");

    const erste = await t.schutzschicht.entscheiden(
      vorschlag.aktion.id,
      "freigeben",
      ctx,
    );
    const zweite = await t.schutzschicht.entscheiden(
      vorschlag.aktion.id,
      "freigeben",
      ctx,
    );

    expect(erste).toMatchObject({
      art: "erledigt",
      aktion: { status: "erledigt" },
    });
    expect(zweite).toMatchObject({ art: "fehler", grund: "entschieden" });
    expect(t.schreiben).toHaveBeenCalledOnce();
    expect(t.kalender).toEqual(["Zahnarzt"]);
  });

  it("lässt niemand anderen eine fremde Aktion freigeben", async () => {
    const vorschlag = await t.schutzschicht.aufrufen(
      "schreiben",
      { titel: "Zahnarzt" },
      ctx,
    );
    if (vorschlag.art !== "freigabe") throw new Error("Freigabe erwartet");

    const fremd = await t.schutzschicht.entscheiden(
      vorschlag.aktion.id,
      "freigeben",
      {
        ...ctx,
        nutzerId: "nutzer-b",
      },
    );

    expect(fremd).toMatchObject({ art: "fehler", grund: "unbekannt" });
    expect(t.schreiben).not.toHaveBeenCalled();
  });

  it("weist ungültige Eingaben und unbekannte Werkzeuge ab", async () => {
    expect(
      await t.schutzschicht.aufrufen("schreiben", { titel: "" }, ctx),
    ).toMatchObject({
      art: "fehler",
    });
    expect(
      await t.schutzschicht.aufrufen("gibt-es-nicht", {}, ctx),
    ).toMatchObject({
      art: "fehler",
    });
    expect(t.schreiben).not.toHaveBeenCalled();
  });

  it("meldet einen Fehler beim Ausführen als fehlgeschlagen", async () => {
    t.schreiben.mockRejectedValueOnce(new Error("Kalender voll"));
    const vorschlag = await t.schutzschicht.aufrufen(
      "schreiben",
      { titel: "Zahnarzt" },
      ctx,
    );
    if (vorschlag.art !== "freigabe") throw new Error("Freigabe erwartet");

    const ergebnis = await t.schutzschicht.entscheiden(
      vorschlag.aktion.id,
      "freigeben",
      ctx,
    );

    expect(ergebnis).toMatchObject({
      art: "fehlgeschlagen",
      aktion: { status: "fehlgeschlagen", fehler: "Kalender voll" },
    });
  });

  it("liefert einen Fehler statt abzubrechen, wenn die Vorschau scheitert, und legt keine Aktion an", async () => {
    const speicher = aktionenImArbeitsspeicher();
    const anlegen = vi.spyOn(speicher, "anlegen");
    const ausfuehren = vi.fn(async () => "nie");
    const schutzschicht = erstelleSchutzschicht({
      findeWerkzeug: () => ({
        name: "abhaken",
        modulId: "test",
        werkzeug: {
          description: "",
          effect: "write",
          input: z.object({ id: z.string() }),
          execute: ausfuehren,
          preview: async () => {
            throw new Error("Diese Aufgabe gibt es nicht.");
          },
        },
      }),
      speicher,
    });

    const ergebnis = await schutzschicht.aufrufen("abhaken", { id: "x" }, ctx);

    expect(ergebnis).toEqual({
      art: "fehler",
      meldung: "Diese Aufgabe gibt es nicht.",
    });
    expect(anlegen).not.toHaveBeenCalled();
    expect(ausfuehren).not.toHaveBeenCalled();
  });

  it("liefert einen Fehler statt abzubrechen, wenn ein Lese-Werkzeug scheitert", async () => {
    const schutzschicht = erstelleSchutzschicht({
      findeWerkzeug: () => ({
        name: "lesen",
        modulId: "test",
        werkzeug: {
          description: "",
          effect: "read",
          input: z.object({}),
          execute: async () => {
            throw new Error("Liste nicht lesbar");
          },
        },
      }),
      speicher: aktionenImArbeitsspeicher(),
    });

    expect(await schutzschicht.aufrufen("lesen", {}, ctx)).toEqual({
      art: "fehler",
      meldung: "Liste nicht lesbar",
    });
  });
});
