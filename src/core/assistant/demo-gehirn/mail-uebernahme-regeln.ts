import type { AufgabeErgebnis } from "@/modules/aufgaben-demo";
import type { TerminAnlegenErgebnis } from "@/modules/kalender-demo";
import type {
  Mail,
  MailLesenErgebnis,
  MailsAnzeigenErgebnis,
} from "@/modules/posteingang-demo";
import {
  berlinDatum,
  berlinZeitpunkt,
  formatiereTag,
  formatiereUhrzeit,
} from "@/lib/zeit";
import { findeFrist } from "./aufgaben-regeln";
import { waehleMail } from "./posteingang-regeln";
import { type DemoRegel, rufe, sage } from "./regel";
import { findeTage, findeUhrzeiten, zerlege, type Woerter } from "./verstehen";

/**
 * Aus Mails übernehmen (Ticket I): Jarvis liest eine Mail und schlägt daraus
 * eine Aufgabe mit Frist oder einen Termin vor, über die vorhandenen
 * Werkzeuge mit Freigabe-Karte. Die Karte nennt die Mail als Quelle.
 * Im Demo-Modus sucht das Demo-Gehirn Tag und Uhrzeit mit seinen festen
 * Wort-Regeln im Mailtext; im Anschluss-Block liest Claude die Mail selbst.
 */

const NICHT_GELESEN = "Den Demo-Posteingang konnte ich gerade nicht lesen.";

/** Wörter, die zum Befehl gehören und nicht zum Absender. */
const BEFEHLSWOERTER = new Set([
  "mach",
  "mache",
  "leg",
  "lege",
  "erstell",
  "erstelle",
  "übernimm",
  "übernehme",
  "trag",
  "trage",
  "ein",
  "eine",
  "einen",
  "aus",
  "der",
  "die",
  "das",
  "dem",
  "den",
  "mail",
  "e-mail",
  "email",
  "nachricht",
  "von",
  "vom",
  "aufgabe",
  "termin",
  "daraus",
  "als",
  "bitte",
  "mir",
  "mal",
  "ohne",
  "frist",
  "jarvis",
]);

type Verstanden = {
  art: "aufgabe" | "termin";
  /** Wonach im Posteingang gesucht wird, z. B. „Bibliothek“ */
  absender: string;
  /** Vom Nutzer genannt; hat Vorrang vor dem Mailtext */
  tag?: string;
  zeit?: { stunde: number; minute: number };
  ohneFrist: boolean;
};

function verstehe(text: string, jetzt: Date): Verstanden | null {
  const w = zerlege(text);
  const satz = ` ${w.klein.join(" ")} `;
  // „aus der Mail“: ohne „aus“ ist es z. B. „Neue Aufgabe: Mail an Lena …“
  const ausMail =
    / aus /.test(satz) && / (mail|e-mail|email|nachricht|mails) /.test(satz);
  if (!ausMail || / neue (aufgabe|to-do|todo) /.test(satz)) return null;
  const art = / aufgabe /.test(satz)
    ? "aufgabe"
    : / termin /.test(satz)
      ? "termin"
      : null;
  if (!art) return null;

  const verbraucht = new Set<number>();
  const frist = findeFrist(w, jetzt);
  frist?.positionen.forEach((p) => verbraucht.add(p));
  const zeit = findeUhrzeiten(w)[0];
  zeit?.positionen.forEach((p) => verbraucht.add(p));
  // „Lenas Mail“ → „Lena“
  const absender = w.original
    .map((wort, i) =>
      w.klein[i + 1] === "mail" && /s$/.test(wort) && wort.length > 3
        ? wort.slice(0, -1)
        : wort,
    )
    .filter(
      (wort, i) =>
        !verbraucht.has(i) && !BEFEHLSWOERTER.has(wort.toLowerCase()),
    )
    .join(" ");
  return {
    art,
    absender,
    ...(frist ? { tag: frist.datum } : {}),
    ...(zeit ? { zeit: { stunde: zeit.stunde, minute: zeit.minute } } : {}),
    ohneFrist: / ohne frist /.test(satz),
  };
}

/** Frist im Mailtext: am liebsten „bis Freitag“, sonst der erste Tag. */
function fristAusText(w: Woerter, jetzt: Date) {
  const tage = findeTage(w, jetzt);
  const mitBis = tage.find((t) =>
    ["bis", "spätestens"].includes(
      w.klein[Math.min(...t.positionen) - 1] ?? "",
    ),
  );
  return (mitBis ?? tage[0])?.datum;
}

/** Titel aus dem Betreff: ohne „Re:“, „Erinnerung:“, „Ihr“ und ohne „am Donnerstag“ */
function titelAusBetreff(betreff: string, jetzt: Date, ohneTag: boolean) {
  let titel = betreff
    .replace(/^(re|aw|erinnerung|wg|fwd?):\s*/i, "")
    .replace(/^(ihr|ihre|dein|deine)\s+/i, "");
  if (ohneTag) {
    const w = zerlege(titel);
    const weg = new Set(findeTage(w, jetzt).flatMap((t) => t.positionen));
    titel = w.original.filter((_, i) => !weg.has(i)).join(" ");
  }
  return titel.charAt(0).toUpperCase() + titel.slice(1);
}

const quelle = (mail: Mail) => `Mail von ${mail.von}: „${mail.betreff}“`;

/** Vorschlag aus der gelesenen Mail, oder eine Rückfrage, wenn etwas fehlt. */
function vorschlag(v: Verstanden, mail: Mail, jetzt: Date) {
  const w = zerlege(mail.text);
  const beispielAbsender = v.absender || mail.von;

  if (v.art === "aufgabe") {
    const titel = titelAusBetreff(mail.betreff, jetzt, false);
    const frist = v.ohneFrist ? undefined : (v.tag ?? fristAusText(w, jetzt));
    if (!frist && !v.ohneFrist) {
      return sage(
        `In der Mail von ${mail.von} finde ich kein Datum. Bis wann soll „${titel}“ erledigt sein? Sag es mir zum Beispiel so: „Mach aus der Mail von ${beispielAbsender} eine Aufgabe bis Freitag“, oder „… eine Aufgabe ohne Frist“.`,
      );
    }
    return rufe("aufgabe_anlegen", {
      titel,
      ...(frist ? { frist } : {}),
      quelle: quelle(mail),
    });
  }

  const titel = titelAusBetreff(mail.betreff, jetzt, true);
  const tag = v.tag ?? findeTage(w, jetzt)[0]?.datum;
  const zeiten = findeUhrzeiten(w);
  const zeit = v.zeit ?? zeiten[0];
  if (!tag || !zeit) {
    const fehlt = !tag ? "keinen Tag" : "keine Uhrzeit";
    return sage(
      `In der Mail von ${mail.von} finde ich ${fehlt}. Sag es mir dazu, zum Beispiel „Trag den Termin aus der Mail von ${beispielAbsender} am Donnerstag um 8 Uhr ein“.`,
    );
  }
  const beginn = berlinZeitpunkt(tag, zeit.stunde, zeit.minute);
  // „von 8 … bis etwa 12 Uhr“: Die zweite Uhrzeit im Text ist das Ende.
  const ende = !v.zeit ? zeiten[1] : undefined;
  const dauerMinuten = ende
    ? (ende.stunde - zeit.stunde) * 60 + (ende.minute - zeit.minute)
    : undefined;
  return rufe("termin_anlegen", {
    titel,
    beginn: beginn.toISOString(),
    ...(dauerMinuten && dauerMinuten >= 5 ? { dauerMinuten } : {}),
    quelle: quelle(mail),
  });
}

export const ausMailUebernehmen: DemoRegel = {
  werkzeuge: [
    "mails_anzeigen",
    "mail_lesen",
    "aufgabe_anlegen",
    "termin_anlegen",
  ],
  erkenne(text, jetzt) {
    const v = verstehe(text, jetzt);
    if (!v) return null;
    if (!v.absender) {
      return sage(
        "Aus welcher Mail? Sag es mir zum Beispiel so: „Mach aus der Mail von Lena eine Aufgabe“.",
      );
    }
    return rufe("mails_anzeigen", { suche: v.absender.slice(0, 100) });
  },
  weiter(schritt, text, jetzt, bisher) {
    const v = verstehe(text, jetzt)!;
    const { ausgang } = schritt;
    if (schritt.name === "mails_anzeigen") {
      if (ausgang.art !== "ergebnis") return sage(NICHT_GELESEN);
      const { mails } = ausgang.ergebnis as MailsAnzeigenErgebnis;
      const wahl = waehleMail(mails, v.absender);
      if ("antwort" in wahl) return wahl.antwort;
      return rufe("mail_lesen", { id: wahl.mail.id });
    }
    if (schritt.name === "mail_lesen") {
      if (ausgang.art !== "ergebnis") return sage(NICHT_GELESEN);
      return vorschlag(v, (ausgang.ergebnis as MailLesenErgebnis).mail, jetzt);
    }

    const gelesen = bisher.find((s) => s.name === "mail_lesen");
    const von =
      gelesen?.ausgang.art === "ergebnis"
        ? ` (aus der Mail von ${(gelesen.ausgang.ergebnis as MailLesenErgebnis).mail.von})`
        : "";
    if (ausgang.art === "abgelehnt") {
      return sage("In Ordnung, ich habe nichts übernommen.");
    }
    if (ausgang.art === "fehler") {
      return sage(`Das hat leider nicht geklappt: ${ausgang.meldung}`);
    }
    if (schritt.name === "aufgabe_anlegen") {
      const { aufgabe } = ausgang.ergebnis as AufgabeErgebnis;
      const frist = aufgabe.frist
        ? `fällig am ${formatiereTag(aufgabe.frist)}`
        : "ohne Frist";
      return sage(
        `Notiert: „${aufgabe.titel}“ steht jetzt auf deiner Demo-Aufgabenliste, ${frist}${von}.`,
      );
    }
    const { termin } = ausgang.ergebnis as TerminAnlegenErgebnis;
    const beginn = new Date(termin.beginn);
    return sage(
      `Erledigt: „${termin.titel}“ steht jetzt am ${formatiereTag(berlinDatum(beginn))}, um ${formatiereUhrzeit(beginn)} Uhr im Demo-Kalender${von}.`,
    );
  },
};
