import type {
  AufgabeAnsicht,
  AufgabenAnzeigenErgebnis,
} from "@/modules/aufgaben-demo";
import type { TermineAmTagErgebnis } from "@/modules/kalender-demo";
import type { MailsAnzeigenErgebnis } from "@/modules/posteingang-demo";
import { berlinDatum, formatiereTag, tagePlus } from "@/lib/zeit";
import { fristBeschreibung } from "./aufgaben-regeln";
import { terminZeile } from "./kalender-regeln";
import { type DemoRegel, type WerkzeugSchritt, rufe, sage } from "./regel";
import { findeTag, zerlege } from "./verstehen";

/**
 * Tagesüberblick und Abendrückblick: Ergebnisse mehrerer Module in einer
 * Antwort. Wie später bei Claude in mehreren Lese-Schritten nacheinander.
 * Nur lesen, nichts ändert sich.
 */

const FEHLER = "Den Überblick konnte ich gerade nicht zusammenstellen.";

function ergebnis<T>(schritt: WerkzeugSchritt | undefined): T | null {
  return schritt?.ausgang.art === "ergebnis"
    ? (schritt.ausgang.ergebnis as T)
    : null;
}

/** „Termine (4):\n• …“ oder „Termine: keine.“ */
function terminTeil(ueberschrift: string, { termine }: TermineAmTagErgebnis) {
  return termine.length === 0
    ? `${ueberschrift}: keine Termine.`
    : `${ueberschrift} (${termine.length}):\n${termine.map(terminZeile).join("\n")}`;
}

function aufgabenZeilen(aufgaben: AufgabeAnsicht[], heute: string) {
  return aufgaben
    .map((a) => `• ${a.titel} – ${fristBeschreibung(a, heute)}`)
    .join("\n");
}

// ---------- Tagesüberblick ----------

function verstehUeberblick(text: string, jetzt: Date) {
  const w = zerlege(text);
  const satz = ` ${w.klein.join(" ")} `;
  const tag = findeTag(w, jetzt);
  const gruss = / guten morgen /.test(satz);
  const gefragt =
    gruss ||
    / (briefing|tagesüberblick|überblick|tagesplan) /.test(satz) ||
    // „Wie sieht mein Tag aus?“, „Wie sieht morgen aus?“, aber nicht das Wetter
    (/ wie sieht /.test(satz) &&
      / aus /.test(satz) &&
      (tag !== null || / tag /.test(satz)) &&
      !/ wetter /.test(satz));
  return gefragt ? { tag: tag?.datum ?? berlinDatum(jetzt), gruss } : null;
}

/** „Posteingang: 3 neue Mails von heute. Heute brauchen dich: …“ */
function postTeil({ mails }: MailsAnzeigenErgebnis, heute: string) {
  const neu = mails.filter(
    (m) => berlinDatum(new Date(m.empfangen)) === heute,
  ).length;
  const neuText =
    neu === 0
      ? "Posteingang: keine neuen Mails von heute."
      : `Posteingang: ${neu === 1 ? "1 neue Mail" : `${neu} neue Mails`} von heute.`;
  const wichtig = mails.filter((m) => m.einordnung === "heute");
  if (wichtig.length === 0) return neuText;
  return `${neuText} Heute brauchen dich: ${wichtig.map((m) => m.von).join(", ")}.`;
}

export const tagesueberblick: DemoRegel = {
  werkzeuge: ["termine_am_tag", "aufgaben_anzeigen", "mails_anzeigen"],
  erkenne(text, jetzt) {
    const gefragt = verstehUeberblick(text, jetzt);
    return gefragt ? rufe("termine_am_tag", { tag: gefragt.tag }) : null;
  },
  weiter(schritt, text, jetzt, bisher) {
    const heute = berlinDatum(jetzt);
    if (schritt.ausgang.art !== "ergebnis") return sage(FEHLER);
    if (schritt.name === "termine_am_tag") {
      const { datum } = schritt.ausgang.ergebnis as TermineAmTagErgebnis;
      return rufe("aufgaben_anzeigen", { faelligBis: datum });
    }

    const kalender = ergebnis<TermineAmTagErgebnis>(
      bisher.find((s) => s.name === "termine_am_tag"),
    );
    if (!kalender) return sage(FEHLER);
    const istHeute = kalender.datum === heute;
    // Neue Mails gehören nur in den Überblick für heute.
    if (schritt.name === "aufgaben_anzeigen" && istHeute) {
      return rufe("mails_anzeigen", {});
    }
    const aufgabenErgebnis = ergebnis<AufgabenAnzeigenErgebnis>(
      schritt.name === "aufgaben_anzeigen"
        ? schritt
        : bisher.find((s) => s.name === "aufgaben_anzeigen"),
    );
    if (!aufgabenErgebnis) return sage(FEHLER);
    const { aufgaben } = aufgabenErgebnis;

    const kopf = `${verstehUeberblick(text, jetzt)?.gruss ? "Guten Morgen! " : ""}Dein Überblick für ${istHeute ? "heute, " : ""}${formatiereTag(kalender.datum)}:`;
    const termine =
      kalender.termine.length === 0
        ? "Termine: keine."
        : terminTeil("Termine", kalender);
    const bis = istHeute ? "bis heute" : `bis ${formatiereTag(kalender.datum)}`;
    const aufgabenTeil =
      aufgaben.length === 0
        ? `Fällige Aufgaben ${bis}: keine.`
        : `Fällige Aufgaben ${bis} (${aufgaben.length}):\n${aufgabenZeilen(aufgaben, heute)}`;
    const teile = [kopf, termine, aufgabenTeil];
    if (schritt.name === "mails_anzeigen") {
      teile.push(
        postTeil(schritt.ausgang.ergebnis as MailsAnzeigenErgebnis, heute),
      );
    }
    return sage(teile.join("\n\n"));
  },
};

// ---------- Abendrückblick ----------

/**
 * „Abendrückblick“, „Wie war mein Tag?“: heute erledigt, heute im Kalender,
 * morgen im Kalender, was bis morgen offen ist. Vier Lese-Schritte.
 */
export const abendrueckblick: DemoRegel = {
  werkzeuge: ["termine_am_tag", "aufgaben_anzeigen"],
  erkenne(text, jetzt) {
    const satz = ` ${zerlege(text).klein.join(" ")} `;
    const gefragt =
      / (abendrückblick|tagesrückblick|rückblick) /.test(satz) ||
      / wie war (mein tag|der tag|dein tag|heute) /.test(satz);
    return gefragt ? rufe("termine_am_tag", { tag: berlinDatum(jetzt) }) : null;
  },
  weiter(schritt, _text, jetzt, bisher) {
    if (schritt.ausgang.art !== "ergebnis") return sage(FEHLER);
    const heute = berlinDatum(jetzt);
    const morgen = tagePlus(heute, 1);
    // Die Schritte laufen in fester Reihenfolge; ihre Zahl sagt, wo wir sind.
    switch (bisher.length) {
      case 0:
        return rufe("aufgaben_anzeigen", { status: "erledigt" });
      case 1:
        return rufe("termine_am_tag", { tag: morgen });
      case 2:
        return rufe("aufgaben_anzeigen", {});
    }

    const [kalenderHeute, erledigte, kalenderMorgen] = bisher;
    const heuteTermine = ergebnis<TermineAmTagErgebnis>(kalenderHeute);
    const erledigt = ergebnis<AufgabenAnzeigenErgebnis>(erledigte);
    const morgenTermine = ergebnis<TermineAmTagErgebnis>(kalenderMorgen);
    const offen = ergebnis<AufgabenAnzeigenErgebnis>(schritt);
    if (!heuteTermine || !erledigt || !morgenTermine || !offen) {
      return sage(FEHLER);
    }

    const heuteErledigt = erledigt.aufgaben.filter(
      (a) => a.erledigtAm && berlinDatum(new Date(a.erledigtAm)) === heute,
    );
    const erledigtTeil =
      heuteErledigt.length === 0
        ? "Heute erledigt: nichts abgehakt."
        : `Heute erledigt (${heuteErledigt.length}):\n${heuteErledigt.map((a) => `• ${a.titel}`).join("\n")}`;

    const bisMorgen = offen.aufgaben.filter(
      (a) => a.frist !== undefined && a.frist <= morgen,
    );
    const rest = offen.aufgaben.length - bisMorgen.length;
    const offenTeil = [
      bisMorgen.length === 0
        ? "Offen bis morgen: nichts."
        : `Offen bis morgen (${bisMorgen.length}):\n${aufgabenZeilen(bisMorgen, heute)}`,
      ...(rest > 0
        ? [
            `Dazu ${rest === 1 ? "1 weitere offene Aufgabe" : `${rest} weitere offene Aufgaben`} mit späterer oder ohne Frist.`,
          ]
        : []),
    ].join("\n");

    return sage(
      [
        `Dein Abendrückblick für heute, ${formatiereTag(heute)}:`,
        erledigtTeil,
        terminTeil("Heute im Kalender", heuteTermine),
        terminTeil(`Morgen, ${formatiereTag(morgen)}`, morgenTermine),
        offenTeil,
      ].join("\n\n"),
    );
  },
};
