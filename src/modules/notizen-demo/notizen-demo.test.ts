// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { WerkzeugKontext, WriteTool } from "../vertrag";
import { notizenDemo, type NotizenAnzeigenErgebnis } from ".";
import { MAX_NOTIZEN } from "./notizen";

const jetzt = new Date("2026-10-10T08:00:00Z");
const ctx = (): WerkzeugKontext => ({ nutzerId: crypto.randomUUID(), jetzt });
const werkzeug = notizenDemo.tools;

async function anzeigen(c: WerkzeugKontext, eingabe: object = {}) {
  return (await werkzeug.notizen_anzeigen!.execute(
    werkzeug.notizen_anzeigen!.input.parse(eingabe),
    c,
  )) as NotizenAnzeigenErgebnis;
}
const anlegen = werkzeug.notiz_anlegen as WriteTool;
const loeschen = werkzeug.notiz_loeschen as WriteTool;

describe("Modul Notizen (Demo)", () => {
  it("startet mit zwei erfundenen Notizen und sucht nach allen Wörtern", async () => {
    const c = ctx();
    expect((await anzeigen(c)).notizen.map((n) => n.text)).toEqual([
      "Idee: Kräuter auf dem Balkon pflanzen",
      "Geschenkidee für Mama: Kochbuch mit Pasta-Rezepten",
    ]);
    expect(
      (await anzeigen(c, { suche: "kochbuch mama" })).notizen,
    ).toHaveLength(1);
  });

  it("legt erst nach Freigabe an und löscht über die ID", async () => {
    const c = ctx();
    const eingabe = anlegen.input.parse({
      text: "WLAN-Gast: Router-Aufkleber",
    });

    expect(await anlegen.preview(eingabe, c)).toEqual({
      titel: "Notiz anlegen",
      beschreibung: "Jarvis legt diese Notiz in deinen Demo-Notizen ab.",
      daten: [
        { label: "Notiz", wert: "WLAN-Gast: Router-Aufkleber" },
        { label: "Ablage", wert: "Demo-Notizen (nur im Arbeitsspeicher)" },
      ],
    });
    expect((await anzeigen(c)).notizen).toHaveLength(2);

    await anlegen.execute(eingabe, c);
    const [neueste] = (await anzeigen(c)).notizen;
    expect(neueste!.text).toBe("WLAN-Gast: Router-Aufkleber");

    await loeschen.execute(loeschen.input.parse({ id: neueste!.id }), c);
    expect((await anzeigen(c)).notizen).toHaveLength(2);
    await expect(
      loeschen.preview(loeschen.input.parse({ id: neueste!.id }), c),
    ).rejects.toThrow("Diese Notiz gibt es nicht.");
  });

  it("begrenzt Anzahl und Länge", async () => {
    const c = ctx();
    const eingabe = anlegen.input.parse({ text: "x" });
    for (let i = 2; i < MAX_NOTIZEN; i++) await anlegen.execute(eingabe, c);
    await expect(anlegen.execute(eingabe, c)).rejects.toThrow(
      "Die Demo-Notizen sind voll.",
    );
    expect(anlegen.input.safeParse({ text: "x".repeat(501) }).success).toBe(
      false,
    );
  });
});
