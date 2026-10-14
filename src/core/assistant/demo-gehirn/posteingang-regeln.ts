import type {
  EntwuerfeAnzeigenErgebnis,
  EntwurfErgebnis,
  MailKurz,
  MailLesenErgebnis,
  MailsAnzeigenErgebnis,
} from "@/modules/posteingang-demo";
import {
  berlinDatum,
  formatiereTag,
  formatiereUhrzeit,
  tagePlus,
} from "@/lib/zeit";
import type { GehirnAntwort } from "../gehirn";
import { type DemoRegel, type WerkzeugSchritt, rufe, sage } from "./regel";
import { zerlege } from "./verstehen";

/**
 * Regeln für den Demo-Posteingang: Mails lesen und Antwort-Entwürfe ablegen.
 * Jarvis sendet nie etwas und verspricht das auch nicht.
 */

const NICHT_GELESEN = "Den Demo-Posteingang konnte ich gerade nicht lesen.";
const BEISPIEL_ANTWORT = "„Antworte Hausverwaltung: Donnerstag passt, danke!“";

/** „heute, 07:45“, „gestern, 17:40“ oder „Donnerstag, 8. Oktober“ */
function wannText(iso: string, jetzt: Date) {
  const zeitpunkt = new Date(iso);
  const tag = berlinDatum(zeitpunkt);
  const heute = berlinDatum(jetzt);
  if (tag === heute) return `heute, ${formatiereUhrzeit(zeitpunkt)}`;
  if (tag === tagePlus(heute, -1)) {
    return `gestern, ${formatiereUhrzeit(zeitpunkt)}`;
  }
  return formatiereTag(tag);
}

/** Wörter, die nur den Befehl tragen, nicht den Absender oder Betreff. */
const FUELLWOERTER = new Set([
  "zeig",
  "zeige",
  "lies",
  "lese",
  "öffne",
  "was",
  "schreibt",
  "will",
  "wollte",
  "die",
  "der",
  "das",
  "dem",
  "den",
  "mail",
  "e-mail",
  "email",
  "mails",
  "nachricht",
  "von",
  "vom",
  "an",
  "mir",
  "bitte",
  "mal",
  "neue",
  "neueste",
  "letzte",
  "jarvis",
]);

function suchwoerter(woerter: string[]) {
  return woerter.filter((w) => !FUELLWOERTER.has(w.toLowerCase())).join(" ");
}

function gelesen(schritt: WerkzeugSchritt) {
  return schritt.ausgang.art === "ergebnis"
    ? (schritt.ausgang.ergebnis as MailsAnzeigenErgebnis)
    : null;
}

/**
 * Wählt die gemeinte Mail: kommen alle Treffer vom selben Absender, die
 * neueste; sonst fragt Jarvis nach und nennt die Absender.
 */
function waehleMail(
  mails: MailKurz[],
  suche: string,
): { mail: MailKurz } | { antwort: GehirnAntwort } {
  if (mails.length === 0) {
    return {
      antwort: sage(
        `Im Demo-Posteingang finde ich keine Mail zu „${suche}“. Mit „Was ist neu im Posteingang?“ zeige ich dir alle.`,
      ),
    };
  }
  const absender = [...new Set(mails.map((m) => m.von))];
  if (absender.length > 1) {
    return {
      antwort: sage(
        `Dazu passen Mails von mehreren Absendern: ${absender.map((a) => `„${a}“`).join(", ")}. Welchen meinst du?`,
      ),
    };
  }
  return { mail: mails[0]! };
}

// ---------- Mails anzeigen ----------

export const mailsAnzeigen: DemoRegel = {
  werkzeuge: ["mails_anzeigen"],
  erkenne(text) {
    const satz = ` ${zerlege(text).klein.join(" ")} `;
    const gefragt =
      / (posteingang|postfach|mails|e-mails|emails|mail|e-mail|email|inbox) /.test(
        satz,
      );
    return gefragt ? rufe("mails_anzeigen", {}) : null;
  },
  weiter(schritt, _text, jetzt) {
    const ergebnis = gelesen(schritt);
    if (!ergebnis) return sage(NICHT_GELESEN);
    const { mails } = ergebnis;
    if (mails.length === 0) return sage("Der Demo-Posteingang ist leer.");
    const zeilen = mails.map(
      (m) => `• ${wannText(m.empfangen, jetzt)} – ${m.von}: ${m.betreff}`,
    );
    const anzahl =
      mails.length === 1 ? "liegt 1 Mail" : `liegen ${mails.length} Mails`;
    return sage(
      `Im Demo-Posteingang ${anzahl}, die neueste zuerst:\n${zeilen.join("\n")}\n\nMit „Zeig die Mail von …“ lese ich dir eine vor.`,
    );
  },
};

// ---------- Eine Mail lesen ----------

export const mailLesen: DemoRegel = {
  werkzeuge: ["mail_lesen", "mails_anzeigen"],
  erkenne(text) {
    const w = zerlege(text);
    const satz = ` ${w.klein.join(" ")} `;
    const lesen =
      (/ (zeig|zeige|lies|lese|öffne) /.test(satz) &&
        / (mail|e-mail|email|nachricht) /.test(satz)) ||
      / was (schreibt|will|wollte) /.test(satz);
    const suche = suchwoerter(w.original);
    if (!lesen || !suche) return null;
    return rufe("mails_anzeigen", { suche: suche.slice(0, 100) });
  },
  weiter(schritt, text, jetzt) {
    if (schritt.name === "mails_anzeigen") {
      const ergebnis = gelesen(schritt);
      if (!ergebnis) return sage(NICHT_GELESEN);
      const wahl = waehleMail(
        ergebnis.mails,
        suchwoerter(zerlege(text).original),
      );
      if ("antwort" in wahl) return wahl.antwort;
      return rufe("mail_lesen", { id: wahl.mail.id });
    }
    if (schritt.ausgang.art !== "ergebnis") return sage(NICHT_GELESEN);
    const { mail } = schritt.ausgang.ergebnis as MailLesenErgebnis;
    return sage(
      `Mail von ${mail.von} <${mail.adresse}>, ${wannText(mail.empfangen, jetzt)}\nBetreff: ${mail.betreff}\n\n${mail.text}\n\nAntworten kannst du so: „Antworte ${mail.von}: …“. Ich lege dann einen Entwurf an und sende nichts.`,
    );
  },
};

// ---------- Antwort-Entwurf ----------

/** „Antworte der Hausverwaltung: Donnerstag passt!“ → Absender und Text */
function verstehAntwort(text: string) {
  const treffer = text.match(
    /^\s*(?:bitte\s+)?(?:antworte|antwort an|schreib(?:e)? (?:eine antwort|zurück) an)\s+(.+?)(?:\s*:\s*([\s\S]*))?$/i,
  );
  if (!treffer) return null;
  return {
    an: suchwoerter(zerlege(treffer[1]!).original),
    text: treffer[2]?.trim() ?? "",
  };
}

export const antwortEntwurf: DemoRegel = {
  werkzeuge: ["antwort_entwurf_anlegen", "mails_anzeigen"],
  erkenne(text) {
    const v = verstehAntwort(text);
    if (!v) return null;
    if (!v.an) {
      return sage(
        `Wem soll ich antworten? Sag es mir zum Beispiel so: ${BEISPIEL_ANTWORT}.`,
      );
    }
    if (!v.text) {
      return sage(
        `Was soll in der Antwort an „${v.an}“ stehen? Schreib es nach einem Doppelpunkt, zum Beispiel ${BEISPIEL_ANTWORT}.`,
      );
    }
    return rufe("mails_anzeigen", { suche: v.an.slice(0, 100) });
  },
  weiter(schritt, text) {
    const v = verstehAntwort(text)!;
    if (schritt.name === "mails_anzeigen") {
      const ergebnis = gelesen(schritt);
      if (!ergebnis) return sage(NICHT_GELESEN);
      const wahl = waehleMail(ergebnis.mails, v.an);
      if ("antwort" in wahl) return wahl.antwort;
      return rufe("antwort_entwurf_anlegen", {
        mailId: wahl.mail.id,
        text: v.text,
      });
    }
    const { ausgang } = schritt;
    if (ausgang.art === "abgelehnt") {
      return sage("In Ordnung, ich habe keinen Entwurf gespeichert.");
    }
    if (ausgang.art === "fehler") {
      return sage(`Das ging nicht: ${ausgang.meldung}`);
    }
    const { entwurf } = ausgang.ergebnis as EntwurfErgebnis;
    return sage(
      `Gespeichert: Der Antwort-Entwurf an ${entwurf.an} liegt im Demo-Posteingang. Gesendet wird nichts.`,
    );
  },
};

// ---------- Entwürfe anzeigen ----------

export const entwuerfeAnzeigen: DemoRegel = {
  werkzeuge: ["entwuerfe_anzeigen"],
  erkenne(text) {
    const satz = ` ${zerlege(text).klein.join(" ")} `;
    return / (entwürfe|entwurf|entwürfen) /.test(satz)
      ? rufe("entwuerfe_anzeigen", {})
      : null;
  },
  weiter({ ausgang }) {
    if (ausgang.art !== "ergebnis") return sage(NICHT_GELESEN);
    const { entwuerfe } = ausgang.ergebnis as EntwuerfeAnzeigenErgebnis;
    if (entwuerfe.length === 0) {
      return sage("Im Demo-Posteingang liegen keine Entwürfe.");
    }
    const zeilen = entwuerfe.map(
      (e) => `• An ${e.an} – ${e.betreff}: „${e.text}“`,
    );
    const anzahl =
      entwuerfe.length === 1
        ? "liegt 1 Entwurf"
        : `liegen ${entwuerfe.length} Entwürfe`;
    return sage(
      `Im Demo-Posteingang ${anzahl}. Gesendet wurde nichts.\n${zeilen.join("\n")}`,
    );
  },
};
