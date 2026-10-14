import {
  berlinDatum,
  naechsterWochentag,
  tagePlus,
  wochentagVon,
} from "@/lib/zeit";

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

export type TagFund = { datum: string; positionen: number[] };

/** Findet alle „heute“, „morgen“, „übermorgen“ und Wochentage, in Satzreihenfolge. */
export function findeTage(w: Woerter, jetzt: Date): TagFund[] {
  const heute = berlinDatum(jetzt);
  const funde: TagFund[] = [];
  for (let i = 0; i < w.klein.length; i++) {
    const wort = w.klein[i]!;
    let datum: string | null = null;
    if (wort === "heute") datum = heute;
    // „Guten Morgen“ ist ein Gruß, nicht der Tag morgen.
    else if (wort === "morgen" && w.klein[i - 1] !== "guten") {
      datum = tagePlus(heute, 1);
    } else if (wort === "übermorgen") datum = tagePlus(heute, 2);
    else if (WOCHENTAGE.includes(wort)) {
      datum = naechsterWochentag(jetzt, WOCHENTAGE.indexOf(wort));
    }
    if (datum) {
      const positionen = [i];
      if (w.klein[i - 1] === "am") positionen.push(i - 1);
      funde.push({ datum, positionen });
    }
  }
  return funde;
}

/** Findet den ersten Tag im Satz (siehe findeTage). */
export function findeTag(w: Woerter, jetzt: Date): TagFund | null {
  return findeTage(w, jetzt)[0] ?? null;
}

export type UhrzeitFund = {
  stunde: number;
  minute: number;
  positionen: number[];
};

/** Findet alle „10 Uhr“, „um 10“, „10:30“ oder „10.30 Uhr“, in Satzreihenfolge. */
export function findeUhrzeiten(w: Woerter): UhrzeitFund[] {
  const funde: UhrzeitFund[] = [];
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
    funde.push({ stunde, minute, positionen });
  }
  return funde;
}

/** Findet die erste Uhrzeit im Satz (siehe findeUhrzeiten). */
export function findeUhrzeit(w: Woerter): UhrzeitFund | null {
  return findeUhrzeiten(w)[0] ?? null;
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

/**
 * Findet „nächste Woche“ (auch „nächsten“, „kommende“ …): Montag bis Sonntag
 * der Woche nach dieser.
 */
export function findeNaechsteWoche(
  w: Woerter,
  jetzt: Date,
): { von: string; bis: string; positionen: number[] } | null {
  for (let i = 0; i + 1 < w.klein.length; i++) {
    if (
      !/^(nächste|nächster|nächsten|kommende|kommender|kommenden)$/.test(
        w.klein[i]!,
      ) ||
      w.klein[i + 1] !== "woche"
    ) {
      continue;
    }
    const positionen = [i, i + 1];
    let davor = i - 1;
    while (["in", "der", "ab"].includes(w.klein[davor] ?? "")) {
      positionen.push(davor--);
    }
    // Der Montag nach heute; ist heute Montag, dann der in einer Woche.
    const heute = berlinDatum(jetzt);
    const von = tagePlus(heute, 7 - ((wochentagVon(heute) + 6) % 7));
    return { von, bis: tagePlus(von, 6), positionen };
  }
  return null;
}

/**
 * Findet, dass etwas jede Woche stattfinden soll: „jeden Mittwoch“,
 * „mittwochs“, „jede Woche“ oder „wöchentlich“. Bei einem Wochentag auch
 * den nächsten solchen Tag (heute zählt mit).
 */
export function findeWoechentlich(
  w: Woerter,
  jetzt: Date,
): { datum?: string; positionen: number[] } | null {
  for (let i = 0; i < w.klein.length; i++) {
    const wort = w.klein[i]!;
    const naechstes = w.klein[i + 1] ?? "";
    const davor = w.klein[i - 1] === "immer" ? [i - 1] : [];
    if (wort === "jeden" && WOCHENTAGE.includes(naechstes)) {
      return {
        datum: naechsterWochentag(jetzt, WOCHENTAGE.indexOf(naechstes)),
        positionen: [...davor, i, i + 1],
      };
    }
    if (WOCHENTAGE.includes(wort.replace(/s$/, "")) && wort.endsWith("s")) {
      return {
        datum: naechsterWochentag(
          jetzt,
          WOCHENTAGE.indexOf(wort.replace(/s$/, "")),
        ),
        positionen: [...davor, i],
      };
    }
    if (wort === "jede" && naechstes === "woche") {
      return { positionen: [...davor, i, i + 1] };
    }
    if (wort === "wöchentlich") return { positionen: [...davor, i] };
  }
  return null;
}
