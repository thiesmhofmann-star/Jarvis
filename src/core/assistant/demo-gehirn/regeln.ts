import type {
  TerminAnlegenErgebnis,
  TermineAmTagErgebnis,
} from "@/modules/kalender-demo";
import {
  berlinDatum,
  berlinZeitpunkt,
  formatiereTag,
  formatiereUhrzeit,
} from "@/lib/zeit";
import type { WerkzeugAusgang } from "../gehirn";
import { findeTag, findeUhrzeit, zerlege } from "./verstehen";

/**
 * Feste Regeln, mit denen das Demo-Gehirn Claude spielt. Claude erkennt das
 * passende Werkzeug später an dessen Beschreibung; das Demo-Gehirn braucht
 * dafür Schlüsselwörter. Diese Datei verschwindet mit dem Demo-Gehirn.
 */
export type DemoRegel = {
  werkzeug: string;
  /** Passende Eingabe fürs Werkzeug, eine Rückfrage oder null, wenn die Regel nicht passt. */
  erkenne(
    text: string,
    jetzt: Date,
  ): { eingabe: unknown } | { rueckfrage: string } | null;
  /** Macht aus dem Ausgang des Werkzeugs eine Antwort für Thies. */
  formuliere(ausgang: WerkzeugAusgang, jetzt: Date): string;
};

function tagBezeichnung(datum: string, jetzt: Date) {
  return datum === berlinDatum(jetzt)
    ? `Heute, ${formatiereTag(datum)},`
    : `Am ${formatiereTag(datum)},`;
}

const termineAmTag: DemoRegel = {
  werkzeug: "termine_am_tag",
  erkenne(text, jetzt) {
    const w = zerlege(text);
    const satz = w.klein.join(" ");
    const gefragt =
      /\b(was steht|was hab ich|was habe ich|was ist los|was liegt an|welche termine|meine termine|termine|kalender)\b/.test(
        satz,
      );
    if (!gefragt) return null;
    const tag = findeTag(w, jetzt)?.datum ?? berlinDatum(jetzt);
    return { eingabe: { tag } };
  },
  formuliere(ausgang, jetzt) {
    if (ausgang.art !== "ergebnis")
      return "Den Demo-Kalender konnte ich gerade nicht lesen.";
    const { datum, termine } = ausgang.ergebnis as TermineAmTagErgebnis;
    const wann = tagBezeichnung(datum, jetzt);
    if (termine.length === 0)
      return `${wann} stehen im Demo-Kalender keine Termine.`;
    const zeilen = termine.map(
      (t) =>
        `• ${formatiereUhrzeit(new Date(t.beginn))}–${formatiereUhrzeit(new Date(t.ende))} Uhr: ${t.titel}`,
    );
    const anzahl =
      termine.length === 1
        ? "steht 1 Termin"
        : `stehen ${termine.length} Termine`;
    return `${wann} ${anzahl} im Demo-Kalender:\n${zeilen.join("\n")}`;
  },
};

/** Wörter, die zum Befehl gehören und nicht zum Titel des Termins. */
const BEFEHLSWOERTER = new Set([
  "trag",
  "trage",
  "eintragen",
  "bitte",
  "mir",
  "mal",
  "einen",
  "termin",
  "neuen",
  "leg",
  "lege",
  "anlegen",
  "notier",
  "notiere",
  "jarvis",
]);

const terminAnlegen: DemoRegel = {
  werkzeug: "termin_anlegen",
  erkenne(text, jetzt) {
    const w = zerlege(text);
    const satz = ` ${w.klein.join(" ")} `;
    const befehl =
      (/ (trag|trage) /.test(satz) && / ein /.test(satz)) ||
      / (eintragen|anlegen|notier|notiere) /.test(satz) ||
      (/ (leg|lege) /.test(satz) && satz.endsWith(" an "));
    if (!befehl) return null;

    const tag = findeTag(w, jetzt);
    const uhrzeit = findeUhrzeit(w);
    const verbraucht = new Set([
      ...(tag?.positionen ?? []),
      ...(uhrzeit?.positionen ?? []),
    ]);
    const rest = w.original.filter(
      (_, i) => !verbraucht.has(i) && !BEFEHLSWOERTER.has(w.klein[i]!),
    );
    // „ein“ und „an“ beenden den Befehl („Trag … ein“, „Leg … an“).
    while (["ein", "an"].includes(rest.at(-1)?.toLowerCase() ?? "")) rest.pop();
    // „in den Kalender“, „im Kalender“
    const titelWoerter = rest
      .join(" ")
      .replace(/\s*\b(in den|in meinen|im) kalender\b/i, "");
    const titel = titelWoerter.charAt(0).toUpperCase() + titelWoerter.slice(1);

    const beispiel = "zum Beispiel „Trag Zahnarzt Freitag 10 Uhr ein“";
    if (!titel)
      return {
        rueckfrage: `Was soll ich eintragen? Sag es mir in einem Satz, ${beispiel}.`,
      };
    if (!tag) {
      return {
        rueckfrage: `Für welchen Tag soll ich „${titel}“ eintragen? Nenn mir einen Wochentag und eine Uhrzeit, ${beispiel}.`,
      };
    }
    if (!uhrzeit) {
      return {
        rueckfrage: `Um wie viel Uhr soll „${titel}“ stattfinden? Sag es mir noch einmal mit Uhrzeit, ${beispiel}.`,
      };
    }
    const beginn = berlinZeitpunkt(tag.datum, uhrzeit.stunde, uhrzeit.minute);
    return { eingabe: { titel, beginn: beginn.toISOString() } };
  },
  formuliere(ausgang) {
    if (ausgang.art === "abgelehnt")
      return "In Ordnung, ich habe nichts eingetragen.";
    if (ausgang.art === "fehler")
      return `Das hat leider nicht geklappt: ${ausgang.meldung}`;
    const { termin } = ausgang.ergebnis as TerminAnlegenErgebnis;
    const beginn = new Date(termin.beginn);
    return `Erledigt: „${termin.titel}“ steht jetzt am ${formatiereTag(berlinDatum(beginn))}, um ${formatiereUhrzeit(beginn)} Uhr im Demo-Kalender.`;
  },
};

// Reihenfolge zählt: „Trag einen Termin ein“ enthält auch „Termin“.
export const demoRegeln: readonly DemoRegel[] = [terminAnlegen, termineAmTag];
