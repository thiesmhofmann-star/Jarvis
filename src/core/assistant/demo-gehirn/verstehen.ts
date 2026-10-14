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

const MONATE = [
  "januar",
  "februar",
  "märz",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "dezember",
];

/** Kalendertag „JJJJ-MM-TT“, wenn es ihn gibt (kein 31. April) */
function gueltig(jahr: number, monat: number, tag: number) {
  const d = new Date(Date.UTC(jahr, monat - 1, tag));
  return d.getUTCMonth() === monat - 1 && d.getUTCDate() === tag
    ? d.toISOString().slice(0, 10)
    : null;
}

/**
 * Datum ab Wort i: „21.10.“, „21.10.2026“, „21. Oktober“, „21. Oktober 2026“.
 * Ohne Jahr gilt der nächste solche Tag, heute zählt mit.
 */
function datumAb(
  w: Woerter,
  i: number,
  heute: string,
): { datum: string; laenge: number } | null {
  const wort = w.klein[i]!;
  // „um 9.10“ und „9.10 Uhr“ sind Uhrzeiten.
  if (w.klein[i - 1] === "um" || w.klein[i + 1] === "uhr") return null;

  let tag: number, monat: number, jahr: number | undefined, laenge: number;
  const zahlen = wort.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{4}|\d{2}))?$/);
  if (zahlen) {
    tag = Number(zahlen[1]);
    monat = Number(zahlen[2]);
    jahr = zahlen[3] ? Number(zahlen[3].padStart(4, "20")) : undefined;
    laenge = 1;
  } else if (/^\d{1,2}$/.test(wort) && MONATE.includes(w.klein[i + 1] ?? "")) {
    tag = Number(wort);
    monat = MONATE.indexOf(w.klein[i + 1]!) + 1;
    jahr = /^\d{4}$/.test(w.klein[i + 2] ?? "")
      ? Number(w.klein[i + 2])
      : undefined;
    laenge = jahr ? 3 : 2;
  } else {
    return null;
  }

  const diesesJahr = Number(heute.slice(0, 4));
  let datum = gueltig(jahr ?? diesesJahr, monat, tag);
  if (!jahr && (!datum || datum < heute)) {
    datum = gueltig(diesesJahr + 1, monat, tag);
  }
  return datum ? { datum, laenge } : null;
}

/**
 * Findet alle Tage in Satzreihenfolge: „heute“, „morgen“, „übermorgen“,
 * Wochentage und Datumsangaben („21.10.“, „21. Oktober“).
 */
export function findeTage(w: Woerter, jetzt: Date): TagFund[] {
  const heute = berlinDatum(jetzt);
  const funde: TagFund[] = [];
  for (let i = 0; i < w.klein.length; i++) {
    const wort = w.klein[i]!;
    let datum: string | null = null;
    let laenge = 1;
    if (wort === "heute") datum = heute;
    // „Guten Morgen“ ist ein Gruß, nicht der Tag morgen.
    else if (wort === "morgen" && w.klein[i - 1] !== "guten") {
      datum = tagePlus(heute, 1);
    } else if (wort === "übermorgen") datum = tagePlus(heute, 2);
    else if (WOCHENTAGE.includes(wort)) {
      datum = naechsterWochentag(jetzt, WOCHENTAGE.indexOf(wort));
    } else {
      const gefunden = datumAb(w, i, heute);
      if (gefunden) ({ datum, laenge } = gefunden);
    }
    if (datum) {
      const positionen = Array.from({ length: laenge }, (_, x) => i + x);
      // „am 21.10.“, „den 21.10.“
      if (["am", "den"].includes(w.klein[i - 1] ?? "")) positionen.push(i - 1);
      funde.push({ datum, positionen });
      i += laenge - 1;
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

/** Zahlwörter für Dauern („zwei Stunden“) */
const ZAHLWOERTER: Record<string, number> = {
  ein: 1,
  eine: 1,
  einer: 1,
  halbe: 0.5,
  anderthalb: 1.5,
  eineinhalb: 1.5,
  zwei: 2,
  drei: 3,
  vier: 4,
  fünf: 5,
  zehn: 10,
  fünfzehn: 15,
  zwanzig: 20,
  dreißig: 30,
  fünfundvierzig: 45,
};

/** Findet eine Dauer: „2 Stunden“, „90 Minuten“, „eine halbe Stunde“, „1 Stunde und 30 Minuten“. */
export function findeDauer(
  w: Woerter,
): { minuten: number; positionen: number[] } | null {
  let minuten = 0;
  const positionen: number[] = [];
  for (let i = 0; i + 1 < w.klein.length; i++) {
    const naechstes = w.klein[i + 1]!;
    const einheit = /^(stunde|stunden|std)$/.test(naechstes)
      ? 60
      : /^(minute|minuten|min)$/.test(naechstes)
        ? 1
        : 0;
    if (!einheit) continue;
    const wort = w.klein[i]!;
    const zahl = ZAHLWOERTER[wort] ?? Number(wort.replace(",", "."));
    if (!Number.isFinite(zahl) || zahl <= 0) continue;
    minuten += zahl * einheit;
    positionen.push(i, i + 1);
    if (wort === "halbe" && w.klein[i - 1] === "eine") positionen.push(i - 1);
  }
  // „und“ zwischen zwei Teilen gehört dazu.
  w.klein.forEach((wort, i) => {
    if (
      wort === "und" &&
      positionen.includes(i - 1) &&
      positionen.includes(i + 1)
    ) {
      positionen.push(i);
    }
  });
  return minuten > 0 ? { minuten: Math.round(minuten), positionen } : null;
}

/** Wörter zwischen „heißt“ und dem neuen Titel („heißt ab jetzt Fußball“) */
const UMFANG_VORSPANN = new Set([
  "ab",
  "jetzt",
  "sofort",
  "heute",
  "künftig",
  "zukünftig",
  "immer",
  "dauerhaft",
  "nur",
  "dieses",
  "mal",
  "diesmal",
  "einmal",
  "von",
  "nun",
  "an",
]);

/**
 * Findet einen neuen Titel: „Benenne X um in Y“, „Benenne X in Y um“,
 * „X heißt ab jetzt Y“, „Ändere den Titel von X in Y“. `positionen` sind
 * Befehl und neuer Titel; der alte Titel bleibt für die Suche übrig.
 */
export function findeUmbenennung(
  w: Woerter,
): { titel: string; positionen: number[]; feststellung: boolean } | null {
  const k = w.klein;
  const ende = k.length;
  const titel = (von: number, bis: number) =>
    w.original.slice(von, bis).join(" ");
  const bereich = (von: number, bis: number) =>
    Array.from({ length: Math.max(bis - von, 0) }, (_, x) => von + x);

  const verb = k.findIndex((x) =>
    ["benenne", "benenn", "nenn", "nenne"].includes(x),
  );
  if (verb >= 0) {
    const um = k.indexOf("um", verb + 2);
    if (um > 0 && k[um + 1] === "in" && um + 2 < ende) {
      return {
        titel: titel(um + 2, ende),
        positionen: [verb, ...bereich(um, ende)],
        feststellung: false,
      };
    }
    const zuletztIn = k.lastIndexOf("in");
    if (k.at(-1) === "um" && zuletztIn > verb + 1 && zuletztIn < ende - 2) {
      return {
        titel: titel(zuletztIn + 1, ende - 1),
        positionen: [verb, ...bereich(zuletztIn, ende)],
        feststellung: false,
      };
    }
  }

  const heisst = k.findIndex((x) => ["heißt", "heisst", "heißen"].includes(x));
  if (heisst > 0) {
    let start = heisst + 1;
    while (UMFANG_VORSPANN.has(k[start] ?? "")) start++;
    if (start < ende) {
      return {
        titel: titel(start, ende),
        positionen: bereich(heisst, ende),
        feststellung: true,
      };
    }
  }

  const name = k.findIndex((x) => ["titel", "namen", "name"].includes(x));
  const von = name >= 0 ? k.indexOf("von", name + 1) : -1;
  if (von > 0) {
    for (let j = ende - 2; j > von + 1; j--) {
      if (["in", "zu", "auf"].includes(k[j]!)) {
        return {
          titel: titel(j + 1, ende),
          positionen: [...bereich(0, von + 1), ...bereich(j, ende)],
          feststellung: false,
        };
      }
    }
  }
  return null;
}
