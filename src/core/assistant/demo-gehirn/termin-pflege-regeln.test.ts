// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { TerminAnsicht } from "@/modules/kalender-demo";
import { werkzeuge as registriert } from "@/modules/registry";
import type { Nachricht, WerkzeugAngebot } from "../gehirn";
import { DEMO_ANTWORT, erstelleDemoGehirn } from ".";

// Samstag, 10. Oktober 2026, 10:00 Uhr in Berlin
const jetzt = new Date("2026-10-10T08:00:00Z");
const werkzeuge: WerkzeugAngebot[] = registriert.map(({ name, werkzeug }) => ({
  name,
  beschreibung: werkzeug.description,
  effekt: werkzeug.effect,
  eingabe: werkzeug.input,
}));
const gehirn = erstelleDemoGehirn();

function frage(text: string) {
  const verlauf: Nachricht[] = [{ rolle: "nutzer", text }];
  return gehirn.antworte({ verlauf, werkzeuge, jetzt });
}

/** Zweiter Schritt: Das Lese-Werkzeug hat diese Termine geliefert. */
function nachLesen(text: string, termine: TerminAnsicht[]) {
  const verlauf: Nachricht[] = [
    { rolle: "nutzer", text },
    {
      rolle: "werkzeug",
      name: "termine_suchen",
      eingabe: {},
      ausgang: {
        art: "ergebnis",
        ergebnis: { text: "", von: "2026-10-10", bis: "2026-11-09", termine },
      },
    },
  ];
  return gehirn.antworte({ verlauf, werkzeuge, jetzt });
}

const training: TerminAnsicht = {
  id: "serie-training",
  titel: "Training",
  beginn: "2026-10-10T18:00:00.000Z",
  ende: "2026-10-10T19:30:00.000Z",
  demo: true,
  vorkommen: "2026-10-10",
};
const laufen: TerminAnsicht = {
  id: "laufen",
  titel: "Laufen im Park",
  beginn: "2026-10-10T16:00:00.000Z",
  ende: "2026-10-10T17:00:00.000Z",
  demo: true,
};

describe("Demo-Gehirn: Termine ändern und absagen", () => {
  it("liest zuerst passende Termine der nächsten 30 Tage", async () => {
    expect(await frage("Verschieb Laufen im Park auf 19 Uhr")).toEqual({
      art: "werkzeug",
      name: "termine_suchen",
      eingabe: { text: "Laufen im Park" },
    });
    expect(await frage("Training ist ab jetzt immer um 19 Uhr")).toEqual({
      art: "werkzeug",
      name: "termine_suchen",
      eingabe: { text: "Training" },
    });
  });

  it("liest einen genannten Tag mit termine_am_tag, „nächste Woche“ als Zeitraum", async () => {
    expect(await frage("Sag Training am Dienstag ab")).toEqual({
      art: "werkzeug",
      name: "termine_am_tag",
      eingabe: { tag: "2026-10-13" },
    });
    expect(await frage("Training fällt nächste Woche aus")).toEqual({
      art: "werkzeug",
      name: "termine_suchen",
      eingabe: { text: "Training", von: "2026-10-12", bis: "2026-10-18" },
    });
    expect(await frage("Training fällt nächste Woche Samstag aus")).toEqual({
      art: "werkzeug",
      name: "termine_am_tag",
      eingabe: { tag: "2026-10-17" },
    });
  });

  it("ändert danach den gewählten Termin über seine ID; nur die Uhrzeit ändert sich", async () => {
    expect(
      await nachLesen("Verschieb Laufen im Park auf 19 Uhr", [laufen]),
    ).toEqual({
      art: "werkzeug",
      name: "termin_aendern",
      eingabe: { id: "laufen", beginn: "2026-10-10T17:00:00.000Z" },
    });
  });

  it("nur ein Tag genannt: Die Uhrzeit bleibt", async () => {
    expect(
      await nachLesen("Verschieb Laufen im Park auf Montag", [laufen]),
    ).toMatchObject({
      name: "termin_aendern",
      eingabe: { id: "laufen", beginn: "2026-10-12T16:00:00.000Z" },
    });
  });

  for (const satz of [
    "Training ist ab jetzt immer um 19 Uhr",
    "Training ist ab sofort um 19 Uhr",
    "Training ist immer um 19 Uhr",
    "Training beginnt künftig um 19 Uhr",
    "Verschieb Training jede Woche auf 19 Uhr",
  ]) {
    it(`„${satz}“ gilt ab diesem Termin immer`, async () => {
      expect(await nachLesen(satz, [training])).toEqual({
        art: "werkzeug",
        name: "termin_aendern",
        eingabe: {
          id: "serie-training",
          vorkommen: "2026-10-10",
          umfang: "ab_diesem_termin",
          beginn: "2026-10-10T17:00:00.000Z",
        },
      });
    });
  }

  it("ohne solche Wörter gilt nur dieses Mal", async () => {
    expect(
      await nachLesen("Verschieb Training auf 19 Uhr", [training]),
    ).toMatchObject({
      eingabe: { vorkommen: "2026-10-10", umfang: "nur_dieses_mal" },
    });
    expect(
      await nachLesen("Training fällt nächste Woche aus", [training]),
    ).toEqual({
      art: "werkzeug",
      name: "termin_absagen",
      eingabe: {
        id: "serie-training",
        vorkommen: "2026-10-10",
        umfang: "nur_dieses_mal",
      },
    });
  });

  it("nimmt bei einem Dauertermin das nächste Vorkommen", async () => {
    const spaeter = {
      ...training,
      beginn: "2026-10-17T18:00:00.000Z",
      ende: "2026-10-17T19:30:00.000Z",
      vorkommen: "2026-10-17",
    };
    expect(
      await nachLesen("Verschieb Training auf 19 Uhr", [training, spaeter]),
    ).toMatchObject({ eingabe: { vorkommen: "2026-10-10" } });
  });

  it("fragt bei verschiedenen passenden Titeln nach, ein genau passender Titel gewinnt", async () => {
    const halle = { ...laufen, id: "halle", titel: "Training Halle" };

    expect(
      await nachLesen("Verschieb Training auf 19 Uhr", [training, halle]),
    ).toMatchObject({
      name: "termin_aendern",
      eingabe: { id: "serie-training" },
    });
    expect(
      await nachLesen("Verschieb Halle auf 19 Uhr", [training, halle]),
    ).toMatchObject({ eingabe: { id: "halle" } });

    const draussen = { ...halle, id: "draussen", titel: "Training draußen" };
    const rueckfrage = await nachLesen("Verschieb Training auf 19 Uhr", [
      halle,
      draussen,
    ]);
    expect(rueckfrage).toEqual({
      art: "text",
      text: "Dazu passen mehrere Termine: „Training Halle“ (Samstag, 10. Oktober), „Training draußen“ (Samstag, 10. Oktober). Welchen meinst du? Nenn mir bitte den ganzen Titel.",
    });
  });

  it("fragt nach, wenn Termin oder Ziel fehlen", async () => {
    expect(await frage("Verschieb auf 19 Uhr")).toMatchObject({
      art: "text",
      text: expect.stringContaining("Welchen Termin soll ich ändern?"),
    });
    expect(await frage("Verschieb Training")).toMatchObject({
      art: "text",
      text: expect.stringContaining("Wohin soll ich „Training“ verschieben?"),
    });
    expect(await frage("Sag bitte ab")).toMatchObject({
      art: "text",
      text: expect.stringContaining("Welchen Termin soll ich absagen?"),
    });
  });

  it("hält Fragen nicht für Änderungen", async () => {
    expect(await frage("Ist Training um 19 Uhr?")).toEqual({
      art: "text",
      text: DEMO_ANTWORT,
    });
  });
});

describe("Demo-Gehirn: Dauertermine anlegen und suchen", () => {
  it("„Trag jeden Mittwoch 20 Uhr Chorprobe ein“ → termin_anlegen wöchentlich", async () => {
    expect(await frage("Trag jeden Mittwoch 20 Uhr Chorprobe ein")).toEqual({
      art: "werkzeug",
      name: "termin_anlegen",
      eingabe: {
        titel: "Chorprobe",
        beginn: "2026-10-14T18:00:00.000Z",
        woechentlich: true,
      },
    });
    expect(await frage("Trag dienstags 18 Uhr Training ein")).toMatchObject({
      eingabe: {
        titel: "Training",
        beginn: "2026-10-13T16:00:00.000Z",
        woechentlich: true,
      },
    });
  });

  it("„Wann ist Training?“ → termine_suchen", async () => {
    expect(await frage("Wann ist Training?")).toEqual({
      art: "werkzeug",
      name: "termine_suchen",
      eingabe: { text: "Training" },
    });
    expect(await frage("Wann ist das nächste Training?")).toMatchObject({
      eingabe: { text: "Training" },
    });
  });
});

describe("Demo-Gehirn: Sätze aus 4D und 8D gehen wie bisher", () => {
  for (const [satz, werkzeug] of [
    ["Was steht heute an?", "termine_am_tag"],
    ["Was steht Freitag an?", "termine_am_tag"],
    ["Trag Zahnarzt Freitag 10 Uhr ein", "termin_anlegen"],
    ["Bitte trag mir am Montag um 9:30 Friseur ein.", "termin_anlegen"],
    ["Neue Aufgabe: Steuererklärung abgeben bis Freitag", "aufgabe_anlegen"],
    ["Neue Aufgabe: Zahnarzt absagen", "aufgabe_anlegen"],
    ["Was ist diese Woche fällig?", "aufgaben_anzeigen"],
    ["Wann ist die Steuererklärung fällig?", "aufgaben_anzeigen"],
    ["Meine Aufgaben", "aufgaben_anzeigen"],
    ["Steuererklärung ist erledigt", "aufgaben_anzeigen"],
  ] as const) {
    it(`„${satz}“ → ${werkzeug}`, async () => {
      expect(await frage(satz)).toMatchObject({
        art: "werkzeug",
        name: werkzeug,
      });
    });
  }

  it("„Trag Zahnarzt Freitag 10 Uhr ein“ bleibt ein Einzeltermin", async () => {
    expect(await frage("Trag Zahnarzt Freitag 10 Uhr ein")).toEqual({
      art: "werkzeug",
      name: "termin_anlegen",
      eingabe: { titel: "Zahnarzt", beginn: "2026-10-16T08:00:00.000Z" },
    });
  });
});
