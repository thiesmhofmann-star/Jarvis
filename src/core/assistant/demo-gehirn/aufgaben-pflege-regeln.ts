import type {
  AufgabeErgebnis,
  AufgabenAnzeigenErgebnis,
} from "@/modules/aufgaben-demo";
import { formatiereTag } from "@/lib/zeit";
import { findeFrist, waehleAufgabe } from "./aufgaben-regeln";
import { type DemoRegel, type WerkzeugSchritt, rufe, sage } from "./regel";
import { findeUmbenennung, zerlege, type Woerter } from "./verstehen";

/**
 * Aufgaben pflegen: Frist oder Titel ändern, löschen, wieder öffnen und
 * erledigte anzeigen. Ändern, Löschen und Öffnen laufen in zwei Schritten
 * wie das Abhaken: erst lesen, dann die gewählte Aufgabe über ihre ID.
 */

const NEUE_AUFGABE = / neue (aufgabe|to-do|todo) /;
const satzVon = (w: Woerter) => ` ${w.klein.join(" ")} `;
const istFrage = (text: string, w: Woerter) =>
  text.trim().endsWith("?") ||
  ["was", "welche", "welcher", "wie", "wann", "ist", "sind"].includes(
    w.klein[0] ?? "",
  );

/** Wörter, die nur den Befehl tragen, nicht den Titel der Aufgabe. */
const FUELLWOERTER = new Set([
  "frist",
  "für",
  "von",
  "vom",
  "der",
  "die",
  "das",
  "den",
  "dem",
  "auf",
  "ist",
  "jetzt",
  "hat",
  "zeit",
  "bis",
  "erst",
  "keine",
  "mehr",
  "ohne",
  "setz",
  "setze",
  "verschieb",
  "verschiebe",
  "verleg",
  "verlege",
  "ändere",
  "änder",
  "ändern",
  "aufgabe",
  "aufgaben",
  "to-do",
  "todo",
  "liste",
  "meiner",
  "meine",
  "entfernen",
  "entfern",
  "entferne",
  "lösch",
  "lösche",
  "löschen",
  "streich",
  "streiche",
  "streichen",
  "weg",
  "aus",
  "nicht",
  "doch",
  "wieder",
  "öffnen",
  "öffne",
  "offen",
  "mach",
  "mache",
  "zurück",
  "erledigt",
  "fertig",
  "es",
  "und",
  "bitte",
  "mir",
  "mal",
  "jarvis",
]);

function suchwoerter(w: Woerter, verbraucht = new Set<number>()) {
  const behalten = w.klein
    .map((klein, i) => ({ klein, original: w.original[i]!, i }))
    .filter((b) => !verbraucht.has(b.i) && !FUELLWOERTER.has(b.klein));
  return {
    klein: behalten.map((b) => b.klein),
    anzeige: behalten.map((b) => b.original).join(" "),
  };
}

function gelesen(schritt: WerkzeugSchritt) {
  return schritt.ausgang.art === "ergebnis"
    ? (schritt.ausgang.ergebnis as AufgabenAnzeigenErgebnis)
    : null;
}

const NICHT_GELESEN = "Die Demo-Aufgaben konnte ich gerade nicht lesen.";

/** Antwort nach einem Schreib-Werkzeug: abgelehnt, Fehler oder Bestätigung */
function nachher(
  { ausgang }: WerkzeugSchritt,
  abgelehnt: string,
  erledigt: (ergebnis: AufgabeErgebnis) => string,
) {
  if (ausgang.art === "abgelehnt") return sage(abgelehnt);
  if (ausgang.art === "fehler")
    return sage(`Das ging nicht: ${ausgang.meldung}`);
  return sage(erledigt(ausgang.ergebnis as AufgabeErgebnis));
}

// ---------- Frist oder Titel ändern ----------

function verstehAenderung(text: string, jetzt: Date) {
  const w = zerlege(text);
  const satz = satzVon(w);
  if (NEUE_AUFGABE.test(satz)) return null;
  const umbenennung = / (aufgabe|to-do|todo) /.test(satz)
    ? findeUmbenennung(w)
    : null;
  const fristGenannt =
    / frist /.test(satz) || / (hat zeit bis|erst bis) /.test(satz);
  if (!umbenennung && !fristGenannt) return null;

  const verbraucht = new Set(umbenennung?.positionen);
  // „hat keine Frist mehr“, „Lösch die Frist von …“
  const ohneFrist =
    / (keine frist|ohne frist) /.test(satz) ||
    (/ frist /.test(satz) &&
      / (entfernen|entfern|entferne|weg|lösch|lösche|löschen|streich|streiche) /.test(
        satz,
      ));
  const frist = ohneFrist ? null : findeFrist(w, jetzt);
  const fristFrei =
    frist && !frist.positionen.some((p) => verbraucht.has(p)) ? frist : null;
  fristFrei?.positionen.forEach((p) => verbraucht.add(p));

  return {
    such: suchwoerter(w, verbraucht),
    /** undefined: bleibt; null: entfernen; sonst neuer Tag */
    neueFrist: ohneFrist ? null : fristFrei?.datum,
    neuerTitel: umbenennung?.titel,
  };
}

export const aufgabeAendern: DemoRegel = {
  werkzeuge: ["aufgabe_aendern", "aufgaben_anzeigen"],
  erkenne(text, jetzt) {
    const v = verstehAenderung(text, jetzt);
    if (!v) return null;
    if (v.such.klein.length === 0) {
      return sage(
        "Welche Aufgabe soll ich ändern? Sag es mir zum Beispiel so: „Steuererklärung hat Zeit bis Montag“.",
      );
    }
    if (v.neueFrist === undefined && v.neuerTitel === undefined) {
      return sage(
        `Bis wann soll „${v.such.anzeige}“ fertig sein? Nenn mir einen Tag, zum Beispiel „${v.such.anzeige} hat Zeit bis Montag“.`,
      );
    }
    if (v.neuerTitel && v.neuerTitel.length > 100) {
      return sage("Der neue Titel ist zu lang. Höchstens 100 Zeichen, bitte.");
    }
    return rufe("aufgaben_anzeigen", {});
  },
  weiter(schritt, text, jetzt, bisher) {
    const v = verstehAenderung(text, jetzt)!;
    if (schritt.name === "aufgaben_anzeigen") {
      const ergebnis = gelesen(schritt);
      if (!ergebnis) return sage(NICHT_GELESEN);
      const wahl = waehleAufgabe(ergebnis.aufgaben, v.such, {
        keine: `Ich finde keine offene Demo-Aufgabe zu „${v.such.anzeige}“. Mit „Meine Aufgaben“ zeige ich dir alle offenen.`,
        beispiel: (titel) => `${titel} hat Zeit bis Montag`,
      });
      if ("antwort" in wahl) return wahl.antwort;
      return rufe("aufgabe_aendern", {
        id: wahl.aufgabe.id,
        ...(v.neueFrist !== undefined ? { frist: v.neueFrist } : {}),
        ...(v.neuerTitel ? { titel: v.neuerTitel } : {}),
      });
    }

    return nachher(
      schritt,
      "In Ordnung, die Aufgabe bleibt, wie sie war.",
      ({ aufgabe }) => {
        const vorher = bisher
          .map(gelesen)
          .flatMap((e) => e?.aufgaben ?? [])
          .find((a) => a.id === aufgabe.id);
        const teile = [
          v.neuerTitel ? `heißt jetzt „${aufgabe.titel}“` : "",
          v.neueFrist === undefined
            ? ""
            : aufgabe.frist
              ? `ist jetzt fällig am ${formatiereTag(aufgabe.frist)}`
              : "hat jetzt keine Frist mehr",
        ].filter(Boolean);
        return `Geändert: „${vorher?.titel ?? aufgabe.titel}“ ${teile.join(" und ")}.`;
      },
    );
  },
};

// ---------- Löschen ----------

export const aufgabeLoeschen: DemoRegel = {
  werkzeuge: ["aufgabe_loeschen", "aufgaben_anzeigen"],
  erkenne(text) {
    const w = zerlege(text);
    const satz = satzVon(w);
    const loeschen =
      / (lösch|lösche|löschen|streich|streiche|streichen|entfern|entferne|entfernen) /.test(
        satz,
      ) &&
      / (aufgabe|aufgaben|to-do|todo|liste) /.test(satz) &&
      !NEUE_AUFGABE.test(satz);
    if (!loeschen) return null;
    if (suchwoerter(w).klein.length === 0) {
      return sage(
        "Welche Aufgabe soll ich löschen? Sag es mir zum Beispiel so: „Lösch die Aufgabe Fahrrad aufpumpen“.",
      );
    }
    return rufe("aufgaben_anzeigen", { status: "alle" });
  },
  weiter(schritt, text) {
    if (schritt.name === "aufgaben_anzeigen") {
      const ergebnis = gelesen(schritt);
      if (!ergebnis) return sage(NICHT_GELESEN);
      const such = suchwoerter(zerlege(text));
      const wahl = waehleAufgabe(ergebnis.aufgaben, such, {
        keine: `Ich finde keine Demo-Aufgabe zu „${such.anzeige}“. Mit „Meine Aufgaben“ zeige ich dir alle offenen.`,
        beispiel: (titel) => `Lösch die Aufgabe ${titel}`,
      });
      if ("antwort" in wahl) return wahl.antwort;
      return rufe("aufgabe_loeschen", { id: wahl.aufgabe.id });
    }
    return nachher(
      schritt,
      "In Ordnung, die Aufgabe bleibt auf der Liste.",
      ({ aufgabe }) =>
        `Gelöscht: „${aufgabe.titel}“ steht nicht mehr auf deiner Demo-Aufgabenliste.`,
    );
  },
};

// ---------- Erledigte anzeigen ----------

export const erledigteAnzeigen: DemoRegel = {
  werkzeuge: ["aufgaben_anzeigen"],
  erkenne(text) {
    const satz = satzVon(zerlege(text));
    const gefragt =
      (/ (was habe ich|was hab ich|was ist|was wurde|welche aufgaben sind|welche aufgaben habe ich) /.test(
        satz,
      ) &&
        / (erledigt|abgehakt|geschafft) /.test(satz) &&
        !/ nicht /.test(satz)) ||
      / (erledigte|abgehakte) (aufgaben|to-dos|todos) /.test(satz);
    return gefragt ? rufe("aufgaben_anzeigen", { status: "erledigt" }) : null;
  },
  weiter(schritt) {
    const ergebnis = gelesen(schritt);
    if (!ergebnis) return sage(NICHT_GELESEN);
    const { aufgaben } = ergebnis;
    if (aufgaben.length === 0) {
      return sage("Du hast noch keine Demo-Aufgabe abgehakt.");
    }
    const anzahl =
      aufgaben.length === 1
        ? "1 Demo-Aufgabe"
        : `${aufgaben.length} Demo-Aufgaben`;
    return sage(
      `Erledigt hast du ${anzahl}:\n${aufgaben.map((a) => `• ${a.titel}`).join("\n")}`,
    );
  },
};

// ---------- Wieder öffnen ----------

export const aufgabeWiederOeffnen: DemoRegel = {
  werkzeuge: ["aufgabe_wieder_oeffnen", "aufgaben_anzeigen"],
  erkenne(text) {
    const w = zerlege(text);
    const satz = satzVon(w);
    const oeffnen =
      / (nicht erledigt|nicht fertig|wieder öffnen|wieder offen|wieder auf) /.test(
        satz,
      ) ||
      (/ (öffne|öffnen|mach|mache) /.test(satz) && / wieder /.test(satz));
    // „Was ist noch nicht erledigt?“ fragt nach offenen Aufgaben.
    if (!oeffnen || istFrage(text, w)) return null;
    if (suchwoerter(w).klein.length === 0) {
      return sage(
        "Welche Aufgabe soll wieder offen sein? Sag es mir zum Beispiel so: „Paket ist doch nicht erledigt“.",
      );
    }
    return rufe("aufgaben_anzeigen", { status: "erledigt" });
  },
  weiter(schritt, text) {
    if (schritt.name === "aufgaben_anzeigen") {
      const ergebnis = gelesen(schritt);
      if (!ergebnis) return sage(NICHT_GELESEN);
      const such = suchwoerter(zerlege(text));
      const wahl = waehleAufgabe(ergebnis.aufgaben, such, {
        keine: `Ich finde keine erledigte Demo-Aufgabe zu „${such.anzeige}“. Mit „Was habe ich erledigt?“ zeige ich dir alle erledigten.`,
        beispiel: (titel) => `${titel} ist doch nicht erledigt`,
      });
      if ("antwort" in wahl) return wahl.antwort;
      return rufe("aufgabe_wieder_oeffnen", { id: wahl.aufgabe.id });
    }
    return nachher(
      schritt,
      "In Ordnung, die Aufgabe bleibt erledigt.",
      ({ aufgabe }) =>
        `Wieder offen: „${aufgabe.titel}“ steht wieder auf deiner Demo-Aufgabenliste.`,
    );
  },
};
