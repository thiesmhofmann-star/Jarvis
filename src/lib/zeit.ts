/**
 * Datum und Uhrzeit in der Zeitzone Europe/Berlin (siehe CLAUDE.md, Fallstricke).
 * Ohne Zusatzpaket: Die Umrechnung nutzt Intl, das Browser und Node mitbringen.
 */
export const ZEITZONE = "Europe/Berlin";

export type BerlinTeile = {
  jahr: number;
  monat: number; // 1–12
  tag: number;
  stunde: number;
  minute: number;
  wochentag: number; // 0 = Sonntag … 6 = Samstag
};

const teileFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: ZEITZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
  hourCycle: "h23",
});

const WOCHENTAGE_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Zerlegt einen Zeitpunkt in Berliner Ortszeit. */
export function berlinTeile(zeitpunkt: Date): BerlinTeile {
  const teile = Object.fromEntries(
    teileFormat.formatToParts(zeitpunkt).map((t) => [t.type, t.value]),
  );
  return {
    jahr: Number(teile.year),
    monat: Number(teile.month),
    tag: Number(teile.day),
    stunde: Number(teile.hour),
    minute: Number(teile.minute),
    wochentag: WOCHENTAGE_EN.indexOf(teile.weekday ?? ""),
  };
}

/** Kalendertag in Berlin als „JJJJ-MM-TT“. */
export function berlinDatum(zeitpunkt: Date): string {
  const { jahr, monat, tag } = berlinTeile(zeitpunkt);
  return [jahr, monat, tag]
    .map((z, i) => String(z).padStart(i ? 2 : 4, "0"))
    .join("-");
}

/** Zeitpunkt zu einem Berliner Kalendertag und einer Berliner Uhrzeit. */
export function berlinZeitpunkt(
  datum: string,
  stunde: number,
  minute: number,
): Date {
  const [jahr, monat, tag] = datum.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const wunsch = Date.UTC(jahr, monat - 1, tag, stunde, minute);
  // Abstand zwischen UTC und Berlin bestimmen; zweimal, damit es auch an den
  // Tagen der Zeitumstellung stimmt.
  let ergebnis = wunsch;
  for (let i = 0; i < 2; i++) {
    const t = berlinTeile(new Date(ergebnis));
    const gesehen = Date.UTC(t.jahr, t.monat - 1, t.tag, t.stunde, t.minute);
    ergebnis += wunsch - gesehen;
  }
  return new Date(ergebnis);
}

/** Kalendertag plus/minus Tage, unabhängig von der Zeitzone. */
export function tagePlus(datum: string, tage: number): string {
  const [jahr, monat, tag] = datum.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(jahr, monat - 1, tag + tage))
    .toISOString()
    .slice(0, 10);
}

/** Wochentag eines Kalendertags (0 = Sonntag). */
export function wochentagVon(datum: string): number {
  return new Date(`${datum}T12:00:00Z`).getUTCDay();
}

/** Nächster Kalendertag mit diesem Wochentag; heute zählt mit. */
export function naechsterWochentag(jetzt: Date, wochentag: number): string {
  const heute = berlinDatum(jetzt);
  const abstand = (wochentag - wochentagVon(heute) + 7) % 7;
  return tagePlus(heute, abstand);
}

const tagFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** „Freitag, 16. Oktober“ */
export function formatiereTag(datum: string): string {
  return tagFormat.format(new Date(`${datum}T12:00:00Z`));
}

const uhrzeitFormat = new Intl.DateTimeFormat("de-DE", {
  timeZone: ZEITZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** „10:00“ in Berliner Zeit */
export function formatiereUhrzeit(zeitpunkt: Date): string {
  return uhrzeitFormat.format(zeitpunkt);
}
