// @vitest-environment node
import { describe, expect, it } from "vitest";
import { formatiereUhrzeit } from "@/lib/zeit";
import type { WerkzeugKontext, WriteTool } from "../vertrag";
import {
  kalenderDemo,
  type TerminAbsagenErgebnis,
  type TerminAendernErgebnis,
  type TerminAnlegenErgebnis,
  type TermineAmTagErgebnis,
  type TermineSuchenErgebnis,
} from ".";

// Samstag, 10. Oktober 2026, 10:00 Uhr in Berlin
const jetzt = new Date("2026-10-10T08:00:00Z");
const ctx = (): WerkzeugKontext => ({ nutzerId: crypto.randomUUID(), jetzt });

const werkzeug = kalenderDemo.tools;
const schreiben = (name: string) => werkzeug[name] as WriteTool;

async function amTag(c: WerkzeugKontext, tag: string) {
  const eingabe = werkzeug.termine_am_tag!.input.parse({ tag });
  return (
    (await werkzeug.termine_am_tag!.execute(eingabe, c)) as TermineAmTagErgebnis
  ).termine;
}

async function suchen(c: WerkzeugKontext, eingabe: object) {
  return (await werkzeug.termine_suchen!.execute(
    werkzeug.termine_suchen!.input.parse(eingabe),
    c,
  )) as TermineSuchenErgebnis;
}

/** Vorschau und Ausführen eines Schreib-Werkzeugs, wie nach „Freigeben“. */
async function vorschau(c: WerkzeugKontext, name: string, eingabe: object) {
  const tool = schreiben(name);
  return tool.preview(tool.input.parse(eingabe), c);
}
async function ausfuehren(c: WerkzeugKontext, name: string, eingabe: object) {
  const tool = schreiben(name);
  return tool.execute(tool.input.parse(eingabe), c);
}

/** „10:00 Training“ je Eintrag, Berliner Zeit */
const kurz = (termine: { beginn: string; titel: string }[]) =>
  termine.map((t) => `${formatiereUhrzeit(new Date(t.beginn))} ${t.titel}`);

async function training(c: WerkzeugKontext) {
  const [t] = (await amTag(c, "2026-10-10")).filter(
    (t) => t.titel === "Training",
  );
  return t!;
}

describe("Demo-Kalender: Dauertermine", () => {
  it("startet heute mit drei Einzelterminen und dem Dauertermin Training", async () => {
    const termine = await amTag(ctx(), "2026-10-10");

    expect(kurz(termine)).toEqual([
      "09:00 Team-Besprechung",
      "12:30 Mittagspause",
      "18:00 Laufen im Park",
      "20:00 Training",
    ]);
    const vorkommen = termine.at(-1)!;
    expect(vorkommen.vorkommen).toBe("2026-10-10");
    expect(vorkommen.ende).toBe("2026-10-10T19:30:00.000Z");
    expect(termine.slice(0, 3).every((t) => t.vorkommen === undefined)).toBe(
      true,
    );
  });

  it("liefert Vorkommen nur an den Tagen der Serie, ab ihrem Starttag", async () => {
    const c = ctx();

    expect(kurz(await amTag(c, "2026-10-17"))).toEqual(["20:00 Training"]);
    expect(kurz(await amTag(c, "2026-09-19"))).toEqual(["20:00 Training"]);
    expect(await amTag(c, "2026-09-12")).toEqual([]);
    expect(await amTag(c, "2026-10-13")).toEqual([]);
  });

  it("18 Uhr bleibt vor und nach der Zeitumstellung am 25.10.2026 18 Uhr", async () => {
    const c = ctx();
    await ausfuehren(c, "termin_anlegen", {
      titel: "Chorprobe",
      beginn: "2026-10-20T18:00:00+02:00",
      woechentlich: true,
    });

    const [vorher] = await amTag(c, "2026-10-20");
    const [nachher] = await amTag(c, "2026-10-27");

    expect(vorher!.beginn).toBe("2026-10-20T16:00:00.000Z"); // Sommerzeit
    expect(nachher!.beginn).toBe("2026-10-27T17:00:00.000Z"); // Winterzeit
    expect(formatiereUhrzeit(new Date(vorher!.beginn))).toBe("18:00");
    expect(formatiereUhrzeit(new Date(nachher!.beginn))).toBe("18:00");
  });

  it("legt wöchentlich an: Karte mit „jede Woche“, danach an den nächsten Mittwochen", async () => {
    const c = ctx();
    const eingabe = {
      titel: "Chorprobe",
      beginn: "2026-10-14T20:00:00+02:00",
      woechentlich: true,
    };

    const karte = await vorschau(c, "termin_anlegen", eingabe);
    expect(karte.titel).toBe("Dauertermin anlegen");
    expect(karte.daten).toContainEqual({
      label: "Wiederholung",
      wert: "Jede Woche am Mittwoch",
    });
    expect(karte.daten).toContainEqual({
      label: "Wann",
      wert: "Ab Mittwoch, 14. Oktober, 20:00 Uhr",
    });

    const { termin } = (await ausfuehren(
      c,
      "termin_anlegen",
      eingabe,
    )) as TerminAnlegenErgebnis;
    expect(termin.vorkommen).toBe("2026-10-14");

    const { termine } = await suchen(c, { text: "chorprobe" });
    expect(termine.map((t) => t.vorkommen)).toEqual([
      "2026-10-14",
      "2026-10-21",
      "2026-10-28",
      "2026-11-04",
    ]);
  });

  it("zählt einen Dauertermin als einen Eintrag für die Obergrenze von 50", async () => {
    const c = ctx();
    // Start: 3 Einzeltermine + 3 Dauertermine = 6
    for (let i = 0; i < 43; i++) {
      await ausfuehren(c, "termin_anlegen", {
        titel: `Termin ${i}`,
        beginn: "2026-10-12T09:00:00+02:00",
      });
    }
    await ausfuehren(c, "termin_anlegen", {
      titel: "Yoga",
      beginn: "2026-10-12T07:00:00+02:00",
      woechentlich: true,
    });

    await expect(
      ausfuehren(c, "termin_anlegen", {
        titel: "Zu viel",
        beginn: "2026-10-12T10:00:00+02:00",
        woechentlich: true,
      }),
    ).rejects.toThrow("Der Demo-Kalender ist voll.");
  });
});

describe("Demo-Kalender: termine_suchen", () => {
  it("sucht ohne Zeitraum heute und die nächsten 30 Tage, alle Wörter im Titel", async () => {
    const c = ctx();

    const training = await suchen(c, { text: "TRAINING" });
    expect(training.von).toBe("2026-10-10");
    expect(training.bis).toBe("2026-11-09");
    expect(training.termine.map((t) => t.vorkommen)).toEqual([
      "2026-10-10",
      "2026-10-17",
      "2026-10-24",
      "2026-10-31",
      "2026-11-07",
    ]);

    const park = await suchen(c, { text: "park laufen" });
    expect(kurz(park.termine)).toEqual(["18:00 Laufen im Park"]);
    expect((await suchen(c, { text: "Fliegen lernen" })).termine).toEqual([]);
  });

  it("sucht in einem genannten Zeitraum und lehnt unsinnige Zeiträume ab", async () => {
    const c = ctx();
    const woche = await suchen(c, {
      text: "Training",
      von: "2026-10-12",
      bis: "2026-10-18",
    });
    expect(woche.termine.map((t) => t.vorkommen)).toEqual(["2026-10-17"]);

    await expect(
      suchen(c, { text: "Training", von: "2026-10-18", bis: "2026-10-12" }),
    ).rejects.toThrow("Der Zeitraum endet, bevor er anfängt.");
    await expect(
      suchen(c, { text: "Training", von: "2026-01-01", bis: "2027-12-31" }),
    ).rejects.toThrow("Ich suche höchstens ein Jahr auf einmal.");
  });
});

describe("Demo-Kalender: termin_aendern", () => {
  it("verschiebt einen Einzeltermin; die Karte zeigt Bisher und Neu", async () => {
    const c = ctx();
    const laufen = (await amTag(c, "2026-10-10")).find(
      (t) => t.titel === "Laufen im Park",
    )!;
    const eingabe = { id: laufen.id, beginn: "2026-10-10T19:00:00+02:00" };

    const karte = await vorschau(c, "termin_aendern", eingabe);
    expect(karte.titel).toBe("Termin ändern");
    expect(karte.daten).toEqual([
      { label: "Was", wert: "Laufen im Park" },
      { label: "Bisher", wert: "Samstag, 10. Oktober, 18:00 bis 19:00 Uhr" },
      { label: "Neu", wert: "Samstag, 10. Oktober, 19:00 bis 20:00 Uhr" },
      { label: "Kalender", wert: "Demo-Kalender (nur im Arbeitsspeicher)" },
    ]);
    // Die Vorschau ändert noch nichts.
    expect(kurz(await amTag(c, "2026-10-10"))).toContain(
      "18:00 Laufen im Park",
    );

    await ausfuehren(c, "termin_aendern", eingabe);
    expect(kurz(await amTag(c, "2026-10-10"))).toContain(
      "19:00 Laufen im Park",
    );
  });

  it("ändert Dauer und Titel; bei neuem Titel stehen die Titel in Bisher und Neu", async () => {
    const c = ctx();
    const laufen = (await amTag(c, "2026-10-10")).find(
      (t) => t.titel === "Laufen im Park",
    )!;
    const eingabe = {
      id: laufen.id,
      titel: "Laufen am See",
      dauerMinuten: 90,
    };

    const karte = await vorschau(c, "termin_aendern", eingabe);
    expect(karte.daten).toContainEqual({
      label: "Neu",
      wert: "„Laufen am See“, Samstag, 10. Oktober, 18:00 bis 19:30 Uhr",
    });

    const { termin } = (await ausfuehren(
      c,
      "termin_aendern",
      eingabe,
    )) as TerminAendernErgebnis;
    expect(termin).toMatchObject({
      titel: "Laufen am See",
      ende: "2026-10-10T17:30:00.000Z",
    });
  });

  it("„nur dieses Mal“ ändert genau ein Vorkommen", async () => {
    const c = ctx();
    const t = await training(c);
    const eingabe = {
      id: t.id,
      vorkommen: "2026-10-10",
      umfang: "nur_dieses_mal",
      beginn: "2026-10-10T19:00:00+02:00",
    };

    const karte = await vorschau(c, "termin_aendern", eingabe);
    expect(karte.daten).toContainEqual({
      label: "Gilt für",
      wert: "Nur am Samstag, 10. Oktober",
    });
    expect(karte.daten).toContainEqual({
      label: "Neu",
      wert: "Samstag, 10. Oktober, 19:00 bis 20:30 Uhr",
    });

    await ausfuehren(c, "termin_aendern", eingabe);
    expect(kurz(await amTag(c, "2026-10-10"))).toContain("19:00 Training");
    expect(kurz(await amTag(c, "2026-10-17"))).toEqual(["20:00 Training"]);
    expect(kurz(await amTag(c, "2026-10-03"))).toEqual(["20:00 Training"]);
  });

  it("zeigt ein einzeln auf einen anderen Tag verschobenes Vorkommen an diesem Tag", async () => {
    const c = ctx();
    const t = await training(c);
    await ausfuehren(c, "termin_aendern", {
      id: t.id,
      vorkommen: "2026-10-17",
      umfang: "nur_dieses_mal",
      beginn: "2026-10-18T10:00:00+02:00",
    });

    expect(await amTag(c, "2026-10-17")).toEqual([]);
    const [verschoben] = await amTag(c, "2026-10-18");
    expect(verschoben).toMatchObject({
      titel: "Training",
      vorkommen: "2026-10-17",
    });
  });

  it("„ab diesem Termin immer“ ändert dieses und alle späteren, frühere bleiben", async () => {
    const c = ctx();
    const t = await training(c);
    const eingabe = {
      id: t.id,
      vorkommen: "2026-10-10",
      umfang: "ab_diesem_termin",
      beginn: "2026-10-10T19:00:00+02:00",
    };

    const karte = await vorschau(c, "termin_aendern", eingabe);
    expect(karte.daten).toContainEqual({
      label: "Gilt für",
      wert: "Ab Samstag, 10. Oktober jede Woche",
    });
    expect(karte.beschreibung).toContain("Frühere Termine bleiben");

    const { umfang } = (await ausfuehren(
      c,
      "termin_aendern",
      eingabe,
    )) as TerminAendernErgebnis;
    expect(umfang).toBe("ab_diesem_termin");

    expect(kurz(await amTag(c, "2026-10-03"))).toEqual(["20:00 Training"]);
    expect(kurz(await amTag(c, "2026-09-19"))).toEqual(["20:00 Training"]);
    expect(kurz(await amTag(c, "2026-10-10"))).toContain("19:00 Training");
    expect(kurz(await amTag(c, "2026-10-17"))).toEqual(["19:00 Training"]);
    // auch nach der Zeitumstellung
    expect(kurz(await amTag(c, "2026-10-31"))).toEqual(["19:00 Training"]);
    // Ab heute gehören alle Vorkommen zur neuen Serie.
    const { termine } = await suchen(c, { text: "Training" });
    expect(new Set(termine.map((x) => x.id)).size).toBe(1);
  });

  it("„ab diesem Termin immer“ am ersten Vorkommen ersetzt die Serie unter derselben ID", async () => {
    const c = ctx();
    await ausfuehren(c, "termin_anlegen", {
      titel: "Chorprobe",
      beginn: "2026-10-14T20:00:00+02:00",
      woechentlich: true,
    });
    const [chor] = await amTag(c, "2026-10-14");

    await ausfuehren(c, "termin_aendern", {
      id: chor!.id,
      vorkommen: "2026-10-14",
      umfang: "ab_diesem_termin",
      titel: "Chor",
    });

    const { termine } = await suchen(c, { text: "Chor" });
    expect(termine.map((t) => [t.id, t.titel])).toEqual(
      Array(4).fill([chor!.id, "Chor"]),
    );
  });

  it("verlangt mindestens eine Änderung, die wirklich etwas ändert", async () => {
    const c = ctx();
    const t = await training(c);
    const ziel = {
      id: t.id,
      vorkommen: "2026-10-10",
      umfang: "nur_dieses_mal",
    };

    await expect(vorschau(c, "termin_aendern", ziel)).rejects.toThrow(
      "Sag mir, was sich ändern soll: Beginn, Dauer oder Titel.",
    );
    await expect(
      vorschau(c, "termin_aendern", {
        ...ziel,
        beginn: "2026-10-10T20:00:00+02:00",
      }),
    ).rejects.toThrow("Bei „Training“ ändert sich damit nichts.");
  });

  it("meldet unbekannte ID, unbekanntes Vorkommen und Umfang beim Einzeltermin auf Deutsch", async () => {
    const c = ctx();
    const t = await training(c);
    const laufen = (await amTag(c, "2026-10-10")).find(
      (x) => x.titel === "Laufen im Park",
    )!;
    const beginn = "2026-10-10T19:00:00+02:00";

    await expect(
      vorschau(c, "termin_aendern", { id: "gibt-es-nicht", beginn }),
    ).rejects.toThrow("Diesen Termin gibt es nicht im Demo-Kalender.");
    await expect(
      vorschau(c, "termin_aendern", {
        id: t.id,
        vorkommen: "2026-10-13",
        umfang: "nur_dieses_mal",
        beginn,
      }),
    ).rejects.toThrow(
      "„Training“ findet am Dienstag, 13. Oktober, nicht statt.",
    );
    await expect(
      vorschau(c, "termin_aendern", {
        id: laufen.id,
        umfang: "nur_dieses_mal",
        beginn,
      }),
    ).rejects.toThrow("„Laufen im Park“ ist ein einzelner Termin.");
    await expect(
      vorschau(c, "termin_aendern", { id: t.id, beginn }),
    ).rejects.toThrow("„Training“ ist ein Dauertermin.");
  });

  it("verschiebt einen Dauertermin ab einem Termin höchstens um 6 Tage", async () => {
    const c = ctx();
    const t = await training(c);

    await expect(
      vorschau(c, "termin_aendern", {
        id: t.id,
        vorkommen: "2026-10-10",
        umfang: "ab_diesem_termin",
        beginn: "2026-10-24T20:00:00+02:00",
      }),
    ).rejects.toThrow("höchstens um 6 Tage");
  });
});

describe("Demo-Kalender: termin_absagen", () => {
  it("entfernt einen Einzeltermin", async () => {
    const c = ctx();
    const laufen = (await amTag(c, "2026-10-10")).find(
      (t) => t.titel === "Laufen im Park",
    )!;

    const karte = await vorschau(c, "termin_absagen", { id: laufen.id });
    expect(karte.titel).toBe("Termin absagen");
    expect(karte.beschreibung).toContain("benachrichtigt niemanden");
    expect(karte.daten).toContainEqual({
      label: "Wann",
      wert: "Samstag, 10. Oktober, 18:00 bis 19:00 Uhr",
    });

    await ausfuehren(c, "termin_absagen", { id: laufen.id });
    expect(kurz(await amTag(c, "2026-10-10"))).not.toContain(
      "18:00 Laufen im Park",
    );
  });

  it("eine Ausnahme lässt genau ein Vorkommen aus, die Woche darauf ist wieder da", async () => {
    const c = ctx();
    const t = await training(c);
    const eingabe = {
      id: t.id,
      vorkommen: "2026-10-17",
      umfang: "nur_dieses_mal",
    };
    const vorher = (await suchen(c, { text: "Training" })).termine;

    const karte = await vorschau(c, "termin_absagen", eingabe);
    expect(karte.daten).toContainEqual({
      label: "Fällt weg",
      wert: "Nur am Samstag, 17. Oktober",
    });

    await ausfuehren(c, "termin_absagen", eingabe);
    const nachher = (await suchen(c, { text: "Training" })).termine;
    expect(nachher.map((x) => x.vorkommen)).toEqual(
      vorher.map((x) => x.vorkommen).filter((tag) => tag !== "2026-10-17"),
    );
    expect(await amTag(c, "2026-10-24")).toHaveLength(1);

    // Ein zweites Mal geht nicht: Das Vorkommen gibt es nicht mehr.
    await expect(vorschau(c, "termin_absagen", eingabe)).rejects.toThrow(
      "findet am Samstag, 17. Oktober, nicht statt",
    );
  });

  it("„ab diesem Termin“ beendet die Serie davor, frühere bleiben", async () => {
    const c = ctx();
    const t = await training(c);
    const eingabe = {
      id: t.id,
      vorkommen: "2026-10-17",
      umfang: "ab_diesem_termin",
    };

    const karte = await vorschau(c, "termin_absagen", eingabe);
    expect(karte.daten).toContainEqual({
      label: "Fällt weg",
      wert: "Ab Samstag, 17. Oktober jede Woche",
    });
    expect(karte.beschreibung).toContain("Frühere Termine bleiben");

    const ergebnis = (await ausfuehren(
      c,
      "termin_absagen",
      eingabe,
    )) as TerminAbsagenErgebnis;
    expect(ergebnis.ganzeSerie).toBe(false);
    expect((await suchen(c, { text: "Training" })).termine).toHaveLength(1);
    expect(await amTag(c, "2026-10-10")).toHaveLength(4);
    expect(await amTag(c, "2026-10-17")).toEqual([]);
  });

  it("„ab diesem Termin“ am ersten Vorkommen entfernt den Dauertermin ganz", async () => {
    const c = ctx();
    await ausfuehren(c, "termin_anlegen", {
      titel: "Chorprobe",
      beginn: "2026-10-14T20:00:00+02:00",
      woechentlich: true,
    });
    const [chor] = await amTag(c, "2026-10-14");
    const eingabe = {
      id: chor!.id,
      vorkommen: "2026-10-14",
      umfang: "ab_diesem_termin",
    };

    expect(
      (await vorschau(c, "termin_absagen", eingabe)).beschreibung,
    ).toContain("ganz aus deinem Demo-Kalender");
    const ergebnis = (await ausfuehren(
      c,
      "termin_absagen",
      eingabe,
    )) as TerminAbsagenErgebnis;
    expect(ergebnis.ganzeSerie).toBe(true);
    expect((await suchen(c, { text: "Chorprobe" })).termine).toEqual([]);
  });

  it("begrenzt die einzelnen Änderungen je Dauertermin", async () => {
    const c = ctx();
    const t = await training(c);
    for (let woche = 0; woche < 20; woche++) {
      const tag = new Date(Date.UTC(2026, 9, 10 + woche * 7))
        .toISOString()
        .slice(0, 10);
      await ausfuehren(c, "termin_absagen", {
        id: t.id,
        vorkommen: tag,
        umfang: "nur_dieses_mal",
      });
    }

    await expect(
      vorschau(c, "termin_absagen", {
        id: t.id,
        vorkommen: "2027-02-27",
        umfang: "nur_dieses_mal",
      }),
    ).rejects.toThrow("zu viele einzelne Änderungen");
  });
});
