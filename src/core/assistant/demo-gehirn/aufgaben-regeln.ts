import type {
  AufgabeAnsicht,
  AufgabeErgebnis,
  AufgabenAnzeigenErgebnis,
} from "@/modules/aufgaben-demo";
import { berlinDatum, formatiereTag } from "@/lib/zeit";
import { alsTitel, type DemoRegel, rufe, sage } from "./regel";
import {
  findeDieseWoche,
  findeTag,
  findeUhrzeit,
  zerlege,
  type Woerter,
} from "./verstehen";

/** Regeln für das Modul aufgaben-demo. Nie Erinnerungen versprechen: Jarvis meldet sich nicht von selbst. */

const BEISPIEL_NEU = "„Neue Aufgabe: Steuererklärung abgeben bis Freitag“";

/** Eine Frist als Tag: „bis Freitag“, „morgen“, „diese Woche“ … */
function findeFrist(w: Woerter, jetzt: Date) {
  const tag = findeTag(w, jetzt);
  if (tag) {
    // „bis Freitag“, „bis zum Freitag“, „für Freitag“
    const positionen = [...tag.positionen];
    let davor = Math.min(...positionen) - 1;
    while (["bis", "zum", "für", "spätestens"].includes(w.klein[davor] ?? "")) {
      positionen.push(davor--);
    }
    return { datum: tag.datum, positionen };
  }
  return findeDieseWoche(w, jetzt);
}

function fristBeschreibung(aufgabe: AufgabeAnsicht, heute: string) {
  if (aufgabe.frist === undefined) return "ohne Frist";
  if (aufgabe.ueberfaellig) {
    return `überfällig (Frist war ${formatiereTag(aufgabe.frist)})`;
  }
  if (aufgabe.frist === heute) return "fällig heute";
  return `fällig ${formatiereTag(aufgabe.frist)}`;
}

export const aufgabenAnzeigen: DemoRegel = {
  werkzeuge: ["aufgaben_anzeigen"],
  erkenne(text, jetzt) {
    const w = zerlege(text);
    const satz = w.klein.join(" ");
    const gefragt =
      /\b(fällig|aufgaben?|to-dos?|todos?|erledigen|zu tun|fristen?)\b/.test(
        satz,
      );
    if (!gefragt) return null;
    const bis = findeDieseWoche(w, jetzt)?.datum ?? findeTag(w, jetzt)?.datum;
    return rufe("aufgaben_anzeigen", bis ? { faelligBis: bis } : {});
  },
  weiter({ ausgang }, _text, jetzt) {
    if (ausgang.art !== "ergebnis") {
      return sage("Die Demo-Aufgaben konnte ich gerade nicht lesen.");
    }
    const { faelligBis, aufgaben } =
      ausgang.ergebnis as AufgabenAnzeigenErgebnis;
    const heute = berlinDatum(jetzt);
    const zeilen = aufgaben.map(
      (a) => `• ${a.titel} – ${fristBeschreibung(a, heute)}`,
    );

    if (faelligBis) {
      const bis =
        faelligBis === heute
          ? "Bis heute"
          : `Bis ${formatiereTag(faelligBis)},`;
      if (aufgaben.length === 0)
        return sage(`${bis} ist keine Demo-Aufgabe fällig.`);
      const anzahl =
        aufgaben.length === 1
          ? "ist 1 Demo-Aufgabe"
          : `sind ${aufgaben.length} Demo-Aufgaben`;
      return sage(`${bis} ${anzahl} fällig:\n${zeilen.join("\n")}`);
    }

    if (aufgaben.length === 0)
      return sage("Du hast keine offenen Demo-Aufgaben.");
    const anzahl =
      aufgaben.length === 1
        ? "eine offene Demo-Aufgabe"
        : `${aufgaben.length} offene Demo-Aufgaben`;
    return sage(`Du hast ${anzahl}:\n${zeilen.join("\n")}`);
  },
};

/** Wörter, die zum Befehl gehören und nicht zum Titel der Aufgabe. */
const ANLEGEN_WOERTER = new Set([
  "neue",
  "neuer",
  "aufgabe",
  "to-do",
  "todo",
  "bitte",
  "mir",
  "mal",
  "eine",
  "leg",
  "lege",
  "trag",
  "trage",
  "anlegen",
  "eintragen",
  "hinzufügen",
  "notier",
  "notiere",
  "jarvis",
]);

export const aufgabeAnlegen: DemoRegel = {
  werkzeuge: ["aufgabe_anlegen"],
  erkenne(text, jetzt) {
    const w = zerlege(text);
    const satz = ` ${w.klein.join(" ")} `;
    const mitAufgabe = / (aufgabe|to-do|todo) /.test(satz);
    const befehl =
      / neue (aufgabe|to-do|todo) /.test(satz) ||
      (mitAufgabe &&
        ((/ (trag|trage) /.test(satz) && / ein /.test(satz)) ||
          / (eintragen|anlegen|hinzufügen|notier|notiere) /.test(satz) ||
          (/ (leg|lege) /.test(satz) && satz.endsWith(" an "))));
    if (!befehl) return null;

    const frist = findeFrist(w, jetzt);
    // Eine Uhrzeit gehört nicht zur Frist (nur Kalendertage) und nicht in den Titel.
    const uhrzeit = findeUhrzeit(w);
    const verbraucht = new Set([
      ...(frist?.positionen ?? []),
      ...(uhrzeit?.positionen ?? []),
    ]);
    // „ein“ und „an“ gehören zum Befehl, wenn sie direkt auf „Aufgabe“ folgen
    // („Trag eine Aufgabe ein: …“) oder den Satz beenden („Leg … an“).
    const befehlsrest = (i: number) =>
      ["ein", "an"].includes(w.klein[i]!) &&
      ["aufgabe", "to-do", "todo"].includes(w.klein[i - 1] ?? "");
    const rest = w.original.filter(
      (_, i) =>
        !verbraucht.has(i) &&
        !ANLEGEN_WOERTER.has(w.klein[i]!) &&
        !befehlsrest(i),
    );
    while (["ein", "an"].includes(rest.at(-1)?.toLowerCase() ?? "")) rest.pop();
    const titel = alsTitel(rest).replace(
      /\s*\b(auf die|auf meine|in die|in meine) liste\b/i,
      "",
    );

    if (!titel) {
      return sage(
        `Was soll auf die Liste? Sag es mir in einem Satz, zum Beispiel ${BEISPIEL_NEU}.`,
      );
    }
    if (titel.length > 100) {
      return sage(
        "Der Titel ist zu lang. Fass die Aufgabe bitte in höchstens 100 Zeichen.",
      );
    }
    return rufe(
      "aufgabe_anlegen",
      frist ? { titel, frist: frist.datum } : { titel },
    );
  },
  weiter({ ausgang }) {
    if (ausgang.art === "abgelehnt") {
      return sage("In Ordnung, ich habe keine Aufgabe angelegt.");
    }
    if (ausgang.art === "fehler") {
      return sage(`Das hat leider nicht geklappt: ${ausgang.meldung}`);
    }
    const { aufgabe } = ausgang.ergebnis as AufgabeErgebnis;
    const frist = aufgabe.frist
      ? `fällig am ${formatiereTag(aufgabe.frist)}`
      : "ohne Frist";
    return sage(
      `Notiert: „${aufgabe.titel}“ steht jetzt auf deiner Demo-Aufgabenliste, ${frist}.`,
    );
  },
};

/** Wörter, die nur sagen, dass etwas erledigt ist, und nicht welche Aufgabe. */
const ERLEDIGT_WOERTER = new Set([
  "ist",
  "sind",
  "wurde",
  "habe",
  "hab",
  "hat",
  "ich",
  "die",
  "den",
  "das",
  "der",
  "dem",
  "aufgabe",
  "bitte",
  "schon",
  "jetzt",
  "endlich",
  "auch",
  "erledigt",
  "abhaken",
  "abgehakt",
  "hak",
  "hake",
  "ab",
  "fertig",
  "geschafft",
  "als",
  "markieren",
  "mal",
  "mit",
  "meine",
  "jarvis",
]);

/** Wonach Thies sucht: die Wörter, die nicht nur „erledigt“ sagen. */
function suchwoerter(text: string) {
  const w = zerlege(text);
  const behalten = w.klein
    .map((wort, i) => ({ wort, original: w.original[i]! }))
    .filter(({ wort }) => !ERLEDIGT_WOERTER.has(wort));
  return {
    klein: behalten.map((b) => b.wort),
    anzeige: behalten.map((b) => b.original).join(" "),
  };
}

function nennung(a: AufgabeAnsicht) {
  return a.frist
    ? `„${a.titel}“ (Frist ${formatiereTag(a.frist)})`
    : `„${a.titel}“ (ohne Frist)`;
}

/**
 * Abhaken in zwei Schritten, genau wie später Claude: erst die offenen
 * Aufgaben lesen, dann die passende auswählen und über ihre ID abhaken.
 */
export const aufgabeErledigen: DemoRegel = {
  werkzeuge: ["aufgabe_erledigen", "aufgaben_anzeigen"],
  erkenne(text) {
    const satz = ` ${zerlege(text).klein.join(" ")} `;
    const fertig =
      / (erledigt|abhaken|abgehakt|geschafft) /.test(satz) ||
      (/ (hak|hake) /.test(satz) && / ab /.test(satz)) ||
      / ist fertig /.test(satz);
    if (!fertig) return null;
    if (suchwoerter(text).klein.length === 0) {
      return sage(
        "Welche Aufgabe ist erledigt? Sag es mir zum Beispiel so: „Steuererklärung ist erledigt“.",
      );
    }
    return rufe("aufgaben_anzeigen", {});
  },
  weiter({ name, ausgang }, text) {
    if (name === "aufgaben_anzeigen") {
      if (ausgang.art !== "ergebnis") {
        return sage("Die Demo-Aufgaben konnte ich gerade nicht lesen.");
      }
      const { aufgaben } = ausgang.ergebnis as AufgabenAnzeigenErgebnis;
      const such = suchwoerter(text);
      const treffer = aufgaben.filter((a) =>
        such.klein.every((s) => a.titel.toLowerCase().includes(s)),
      );
      const genau = treffer.filter(
        (a) => a.titel.toLowerCase() === such.klein.join(" "),
      );
      const auswahl = genau.length === 1 ? genau : treffer;

      if (auswahl.length === 0) {
        return sage(
          `Ich finde keine offene Demo-Aufgabe zu „${such.anzeige}“. Mit „Meine Aufgaben“ zeige ich dir alle offenen.`,
        );
      }
      if (auswahl.length > 1) {
        return sage(
          `Dazu passen mehrere Aufgaben: ${auswahl.map(nennung).join(", ")}. Welche meinst du? Sag es mir bitte genauer, zum Beispiel „${auswahl[0]!.titel} ist erledigt“.`,
        );
      }
      return rufe("aufgabe_erledigen", { id: auswahl[0]!.id });
    }

    if (ausgang.art === "abgelehnt") {
      return sage("In Ordnung, die Aufgabe bleibt offen.");
    }
    if (ausgang.art === "fehler")
      return sage(`Das ging nicht: ${ausgang.meldung}`);
    const { aufgabe } = ausgang.ergebnis as AufgabeErgebnis;
    return sage(`Abgehakt: „${aufgabe.titel}“ ist erledigt.`);
  },
};
