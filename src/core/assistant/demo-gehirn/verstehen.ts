import { berlinDatum, naechsterWochentag, tagePlus } from "@/lib/zeit";

/**
 * Einfaches Wort-Verständnis für das Demo-Gehirn: Wörter, Tage und Uhrzeiten.
 * Kein Sprachmodell, nur feste Regeln.
 */

export type Woerter = { original: string[]; klein: string[] };

export function zerlege(text: string): Woerter {
  const original = text
    .split(/\s+/)
    .map((wort) =>
      // Uhrzeiten wie „10.30“ behalten ihren Punkt, sonst fallen Satzzeichen weg.
      /^\d{1,2}[.:]\d{2}$/.test(wort)
        ? wort
        : wort.replace(/^[„“"'(]+|[„“"'),.!?;:]+$/g, ""),
    )
    .filter(Boolean);
  return { original, klein: original.map((w) => w.toLowerCase()) };
}

const WOCHENTAGE = [
  "sonntag",
  "montag",
  "dienstag",
  "mittwoch",
  "donnerstag",
  "freitag",
  "samstag",
];

/** Findet „heute“, „morgen“, „übermorgen“ oder einen Wochentag. */
export function findeTag(
  w: Woerter,
  jetzt: Date,
): { datum: string; positionen: number[] } | null {
  const heute = berlinDatum(jetzt);
  for (let i = 0; i < w.klein.length; i++) {
    const wort = w.klein[i]!;
    let datum: string | null = null;
    if (wort === "heute") datum = heute;
    else if (wort === "morgen") datum = tagePlus(heute, 1);
    else if (wort === "übermorgen") datum = tagePlus(heute, 2);
    else if (WOCHENTAGE.includes(wort)) {
      datum = naechsterWochentag(jetzt, WOCHENTAGE.indexOf(wort));
    }
    if (datum) {
      const positionen = [i];
      if (w.klein[i - 1] === "am") positionen.push(i - 1);
      return { datum, positionen };
    }
  }
  return null;
}

/** Findet „10 Uhr“, „um 10“, „10:30“ oder „10.30 Uhr“. */
export function findeUhrzeit(
  w: Woerter,
): { stunde: number; minute: number; positionen: number[] } | null {
  for (let i = 0; i < w.klein.length; i++) {
    const treffer = w.klein[i]!.match(/^(\d{1,2})(?:[:.](\d{2}))?$/);
    if (!treffer) continue;
    const mitUhr = w.klein[i + 1] === "uhr";
    const mitUm = w.klein[i - 1] === "um";
    const mitDoppelpunkt = w.klein[i]!.includes(":");
    if (!mitUhr && !mitUm && !mitDoppelpunkt) continue;

    const stunde = Number(treffer[1]);
    const minute = Number(treffer[2] ?? 0);
    if (stunde > 23 || minute > 59) continue;

    const positionen = [i];
    if (mitUhr) positionen.push(i + 1);
    if (mitUm) positionen.push(i - 1);
    return { stunde, minute, positionen };
  }
  return null;
}

/** Findet „diese Woche“ bzw. „(bis Ende) dieser Woche“: bis einschließlich Sonntag. */
export function findeDieseWoche(
  w: Woerter,
  jetzt: Date,
): { datum: string; positionen: number[] } | null {
  for (let i = 0; i + 1 < w.klein.length; i++) {
    if (
      !["diese", "dieser"].includes(w.klein[i]!) ||
      w.klein[i + 1] !== "woche"
    ) {
      continue;
    }
    const positionen = [i, i + 1];
    let davor = i - 1;
    while (
      ["bis", "in", "noch", "ende", "zum"].includes(w.klein[davor] ?? "")
    ) {
      positionen.push(davor--);
    }
    // Sonntag dieser Woche; ist heute Sonntag, dann heute.
    return { datum: naechsterWochentag(jetzt, 0), positionen };
  }
  return null;
}
