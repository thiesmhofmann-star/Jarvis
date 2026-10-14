import type {
  NotizenAnzeigenErgebnis,
  NotizErgebnis,
} from "@/modules/notizen-demo";
import { type DemoRegel, type WerkzeugSchritt, rufe, sage } from "./regel";
import { zerlege, type Woerter } from "./verstehen";

/** Regeln für die Demo-Notizen. */

const BEISPIEL = "„Notiz: Geschenkidee für Mama – Kochbuch“";
const NICHT_GELESEN = "Die Demo-Notizen konnte ich gerade nicht lesen.";

/** „Notiz: …“, „Neue Notiz …“, „Mach mir eine Notiz: …“, „Schreib dir auf: …“ */
function notizText(text: string) {
  const treffer = text.match(
    /^\s*(?:bitte\s+)?(?:(?:neue|eine)\s+notiz|notiz|mach(?:e)?\s+(?:mir\s+)?eine\s+notiz|schreib(?:e)?\s+(?:(?:mir|dir)\s+)?auf)(?=[\s:]|$)\s*:?\s*([\s\S]*)$/i,
  );
  return treffer ? treffer[1]!.trim() : null;
}

export const notizAnlegen: DemoRegel = {
  werkzeuge: ["notiz_anlegen"],
  erkenne(text) {
    const notiz = notizText(text);
    if (notiz === null) return null;
    if (!notiz) {
      return sage(`Was soll ich notieren? Zum Beispiel ${BEISPIEL}.`);
    }
    if (notiz.length > 500) {
      return sage("Die Notiz ist zu lang. Höchstens 500 Zeichen, bitte.");
    }
    return rufe("notiz_anlegen", { text: notiz });
  },
  weiter({ ausgang }) {
    if (ausgang.art === "abgelehnt") {
      return sage("In Ordnung, ich habe nichts notiert.");
    }
    if (ausgang.art === "fehler") {
      return sage(`Das ging nicht: ${ausgang.meldung}`);
    }
    const { notiz } = ausgang.ergebnis as NotizErgebnis;
    return sage(`Notiert: „${notiz.text}“ liegt jetzt in deinen Demo-Notizen.`);
  },
};

/** Wörter, die nur den Befehl tragen, nicht den Inhalt der Notiz. */
const FUELLWOERTER = new Set([
  "zeig",
  "zeige",
  "meine",
  "mein",
  "alle",
  "die",
  "der",
  "das",
  "den",
  "notiz",
  "notizen",
  "zu",
  "zum",
  "zur",
  "über",
  "mit",
  "was",
  "habe",
  "hab",
  "ich",
  "mir",
  "notiert",
  "aufgeschrieben",
  "lösch",
  "lösche",
  "löschen",
  "streich",
  "streiche",
  "entfern",
  "entferne",
  "bitte",
  "mal",
  "jarvis",
]);

function suchwoerter(w: Woerter) {
  return w.original
    .filter((wort) => !FUELLWOERTER.has(wort.toLowerCase()))
    .join(" ");
}

function gelesen(schritt: WerkzeugSchritt) {
  return schritt.ausgang.art === "ergebnis"
    ? (schritt.ausgang.ergebnis as NotizenAnzeigenErgebnis)
    : null;
}

export const notizenAnzeigen: DemoRegel = {
  werkzeuge: ["notizen_anzeigen"],
  erkenne(text) {
    const w = zerlege(text);
    const satz = ` ${w.klein.join(" ")} `;
    if (!/ (notizen|notiert|aufgeschrieben) /.test(satz)) return null;
    const suche = suchwoerter(w);
    return rufe(
      "notizen_anzeigen",
      suche ? { suche: suche.slice(0, 100) } : {},
    );
  },
  weiter(schritt) {
    const ergebnis = gelesen(schritt);
    if (!ergebnis) return sage(NICHT_GELESEN);
    const { suche, notizen } = ergebnis;
    if (notizen.length === 0) {
      return sage(
        suche
          ? `Zu „${suche}“ finde ich keine Demo-Notiz.`
          : `Du hast keine Demo-Notizen. Neue legst du so an: ${BEISPIEL}.`,
      );
    }
    const anzahl =
      notizen.length === 1 ? "1 Demo-Notiz" : `${notizen.length} Demo-Notizen`;
    const kopf = suche
      ? `Zu „${suche}“ finde ich ${anzahl}:`
      : `Du hast ${anzahl}, die neueste zuerst:`;
    return sage(`${kopf}\n${notizen.map((n) => `• ${n.text}`).join("\n")}`);
  },
};

export const notizLoeschen: DemoRegel = {
  werkzeuge: ["notiz_loeschen", "notizen_anzeigen"],
  erkenne(text) {
    const w = zerlege(text);
    const satz = ` ${w.klein.join(" ")} `;
    const loeschen =
      / (lösch|lösche|löschen|streich|streiche|entfern|entferne) /.test(satz) &&
      / notiz /.test(satz);
    if (!loeschen) return null;
    const suche = suchwoerter(w);
    if (!suche) {
      return sage(
        "Welche Notiz soll ich löschen? Sag es mir zum Beispiel so: „Lösch die Notiz Kochbuch“.",
      );
    }
    return rufe("notizen_anzeigen", { suche: suche.slice(0, 100) });
  },
  weiter(schritt) {
    if (schritt.name === "notizen_anzeigen") {
      const ergebnis = gelesen(schritt);
      if (!ergebnis) return sage(NICHT_GELESEN);
      const { suche, notizen } = ergebnis;
      if (notizen.length === 0) {
        return sage(
          `Zu „${suche}“ finde ich keine Demo-Notiz. Mit „Meine Notizen“ zeige ich dir alle.`,
        );
      }
      if (notizen.length > 1) {
        return sage(
          `Dazu passen mehrere Notizen: ${notizen.map((n) => `„${n.text}“`).join(", ")}. Welche meinst du? Nenn mir bitte ein Wort, das nur in dieser steht.`,
        );
      }
      return rufe("notiz_loeschen", { id: notizen[0]!.id });
    }
    const { ausgang } = schritt;
    if (ausgang.art === "abgelehnt") {
      return sage("In Ordnung, die Notiz bleibt.");
    }
    if (ausgang.art === "fehler") {
      return sage(`Das ging nicht: ${ausgang.meldung}`);
    }
    const { notiz } = ausgang.ergebnis as NotizErgebnis;
    return sage(`Gelöscht: Die Notiz „${notiz.text}“ ist weg.`);
  },
};
