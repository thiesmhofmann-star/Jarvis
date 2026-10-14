import type {
  TerminAbsagenErgebnis,
  TerminAendernErgebnis,
  TerminAnsicht,
  TermineAmTagErgebnis,
  TermineSuchenErgebnis,
  Umfang,
} from "@/modules/kalender-demo";
import {
  berlinDatum,
  berlinTeile,
  berlinZeitpunkt,
  formatiereTag,
  formatiereUhrzeit,
  tagePlus,
  wochentagVon,
} from "@/lib/zeit";
import type { GehirnAntwort } from "../gehirn";
import { type DemoRegel, type WerkzeugSchritt, rufe, sage } from "./regel";
import {
  findeNaechsteWoche,
  findeTage,
  findeUhrzeiten,
  zerlege,
} from "./verstehen";

/**
 * Regeln zum Suchen, Ändern und Absagen von Terminen im Demo-Kalender.
 * Ändern und Absagen laufen wie später bei Claude in zwei Schritten: erst
 * passende Termine lesen, dann einen davon über seine ID ändern oder absagen.
 * Nie Benachrichtigungen versprechen: Jarvis schreibt niemandem.
 */

/** Wörter für „ab diesem Termin immer“. Fehlen sie, gilt „nur dieses Mal“. */
const IMMER = [
  "ab jetzt",
  "ab sofort",
  "ab heute",
  "von jetzt an",
  "immer",
  "künftig",
  "zukünftig",
  "jede woche",
  "dauerhaft",
  "ab nächster woche",
  "ab der nächsten woche",
  "ab kommender woche",
];

/** Wörter, die zum Befehl gehören und nicht zum Titel des Termins. */
const BEFEHLSWOERTER = new Set([
  // ändern
  "verschieb",
  "verschiebe",
  "verschieben",
  "verleg",
  "verlege",
  "verlegen",
  "änder",
  "ändere",
  "ändern",
  "ist",
  "sind",
  "beginnt",
  "beginnen",
  "startet",
  "fängt",
  "an",
  "findet",
  "statt",
  "soll",
  "sollen",
  "sein",
  "auf",
  "von",
  "nach",
  // absagen
  "sag",
  "sage",
  "absagen",
  "ab",
  "aus",
  "fällt",
  "fallen",
  "streich",
  "streiche",
  "streichen",
  "lösch",
  "lösche",
  "löschen",
  "entfern",
  "entferne",
  "entfernen",
  // Umfang
  "nur",
  "dieses",
  "diesmal",
  "einmal",
  "ausnahmsweise",
  "jetzt",
  "sofort",
  "immer",
  "künftig",
  "zukünftig",
  "jede",
  "woche",
  "dauerhaft",
  // Füllwörter
  "bitte",
  "mir",
  "mal",
  "den",
  "die",
  "das",
  "der",
  "dem",
  "des",
  "termin",
  "mein",
  "meine",
  "meinen",
  "meinem",
  "kalender",
  "jarvis",
]);

type Verstanden = {
  /** Wonach im Titel gesucht wird */
  such: { klein: string[]; anzeige: string };
  umfang: Umfang;
  /** Welcher Termin: an einem Tag, in einer Woche oder ohne Angabe der nächste */
  quelle: { tag: string } | { von: string; bis: string } | null;
  /** Neuer Tag („auf Mittwoch“) */
  zielTag?: string;
  /** Neue Uhrzeit */
  zielZeit?: { stunde: number; minute: number };
};

function verstehe(text: string, jetzt: Date): Verstanden {
  const w = zerlege(text);
  const satz = ` ${w.klein.join(" ")} `;
  const verbraucht = new Set<number>();

  let quelleTag: string | undefined;
  let zielTag: string | undefined;
  for (const fund of findeTage(w, jetzt)) {
    fund.positionen.forEach((p) => verbraucht.add(p));
    // „auf Mittwoch“, „auf den Mittwoch“: wohin. Sonst: welcher Termin.
    const vor = Math.min(...fund.positionen);
    const istZiel =
      w.klein[vor - 1] === "auf" ||
      (["den", "nächsten", "kommenden"].includes(w.klein[vor - 1] ?? "") &&
        w.klein[vor - 2] === "auf");
    if (istZiel) zielTag ??= fund.datum;
    else quelleTag ??= fund.datum;
  }

  // Bei zwei Uhrzeiten („von 20 auf 19 Uhr“) zählt die letzte.
  const uhrzeiten = findeUhrzeiten(w);
  uhrzeiten.forEach((u) => u.positionen.forEach((p) => verbraucht.add(p)));
  const zielZeit = uhrzeiten.at(-1);

  const woche = findeNaechsteWoche(w, jetzt);
  woche?.positionen.forEach((p) => verbraucht.add(p));
  let quelle: Verstanden["quelle"] = null;
  if (woche && quelleTag) {
    // „nächste Woche Dienstag“: der Dienstag in der nächsten Woche
    quelle = { tag: tagePlus(woche.von, (wochentagVon(quelleTag) + 6) % 7) };
  } else if (woche) {
    quelle = { von: woche.von, bis: woche.bis };
  } else if (quelleTag) {
    quelle = { tag: quelleTag };
  }

  // „im Kalender“, „aus dem Kalender“ gehören nicht zum Titel.
  w.klein.forEach((wort, i) => {
    if (wort !== "kalender") return;
    for (
      let j = i - 1;
      ["im", "in", "aus", "dem", "den"].includes(w.klein[j] ?? "");
      j--
    ) {
      verbraucht.add(j);
    }
  });

  const behalten = w.klein
    .map((klein, i) => ({ klein, original: w.original[i]! }))
    .filter(({ klein }, i) => !verbraucht.has(i) && !BEFEHLSWOERTER.has(klein));
  return {
    such: {
      klein: behalten.map((b) => b.klein),
      anzeige: behalten.map((b) => b.original).join(" "),
    },
    umfang: IMMER.some((p) => satz.includes(` ${p} `))
      ? "ab_diesem_termin"
      : "nur_dieses_mal",
    quelle,
    ...(zielTag ? { zielTag } : {}),
    ...(zielZeit
      ? { zielZeit: { stunde: zielZeit.stunde, minute: zielZeit.minute } }
      : {}),
  };
}

/** Erster Schritt: Termine lesen, an dem genannten Tag oder in der Woche, sonst die nächsten 30 Tage. */
function lies(v: Verstanden): GehirnAntwort {
  const text = v.such.anzeige.slice(0, 100);
  if (v.quelle && "tag" in v.quelle) {
    return rufe("termine_am_tag", { tag: v.quelle.tag });
  }
  if (v.quelle) {
    return rufe("termine_suchen", {
      text,
      von: v.quelle.von,
      bis: v.quelle.bis,
    });
  }
  return rufe("termine_suchen", { text });
}

function zeitraum(
  ergebnis: TermineAmTagErgebnis | TermineSuchenErgebnis,
  jetzt: Date,
) {
  if ("datum" in ergebnis) return `am ${formatiereTag(ergebnis.datum)},`;
  return ergebnis.von === berlinDatum(jetzt)
    ? `bis ${formatiereTag(ergebnis.bis)},`
    : `vom ${formatiereTag(ergebnis.von)}, bis ${formatiereTag(ergebnis.bis)},`;
}

/**
 * Zweiter Schritt: aus den gelesenen Terminen den gemeinten wählen. Passen
 * mehrere Titel, fragt Jarvis nach. Gleicher Titel mehrmals (ein Dauertermin)
 * heißt: der früheste, also das nächste Vorkommen.
 */
function waehle(
  { ausgang }: WerkzeugSchritt,
  v: Verstanden,
  jetzt: Date,
): { termin: TerminAnsicht } | { antwort: GehirnAntwort } {
  if (ausgang.art !== "ergebnis") {
    return {
      antwort: sage("Den Demo-Kalender konnte ich gerade nicht lesen."),
    };
  }
  const ergebnis = ausgang.ergebnis as
    TermineAmTagErgebnis | TermineSuchenErgebnis;
  const passend = ergebnis.termine.filter((t) =>
    v.such.klein.every((s) => t.titel.toLowerCase().includes(s)),
  );
  const genau = passend.filter(
    (t) => t.titel.toLowerCase() === v.such.klein.join(" "),
  );
  const auswahl = genau.length > 0 ? genau : passend;

  if (auswahl.length === 0) {
    return {
      antwort: sage(
        `Im Demo-Kalender finde ich ${zeitraum(ergebnis, jetzt)} keinen Termin zu „${v.such.anzeige}“. Mit „Wann ist …?“ suche ich in den nächsten 30 Tagen.`,
      ),
    };
  }
  const erste = new Map<string, TerminAnsicht>();
  for (const t of auswahl) if (!erste.has(t.titel)) erste.set(t.titel, t);
  if (erste.size > 1) {
    const nennung = [...erste.values()]
      .map(
        (t) =>
          `„${t.titel}“ (${formatiereTag(berlinDatum(new Date(t.beginn)))})`,
      )
      .join(", ");
    return {
      antwort: sage(
        `Dazu passen mehrere Termine: ${nennung}. Welchen meinst du? Nenn mir bitte den ganzen Titel.`,
      ),
    };
  }
  return { termin: auswahl[0]! };
}

/** Bei Dauerterminen gehören Vorkommen und Umfang dazu, bei Einzelterminen nicht. */
function zielVon(t: TerminAnsicht, umfang: Umfang) {
  return t.vorkommen
    ? { id: t.id, vorkommen: t.vorkommen, umfang }
    : { id: t.id };
}

// ---------- Ändern ----------

const AENDERN =
  / (verschieb|verschiebe|verschieben|verleg|verlege|verlegen|änder|ändere|ändern) /;
const FESTSTELLUNG =
  / (ist|sind|beginnt|beginnen|startet|fängt|findet|soll|sollen) /;
/** So beginnen Fragen; „Ist Training um 19 Uhr?“ ist keine Änderung. */
const FRAGE_ANFANG = new Set([
  "was",
  "wann",
  "wie",
  "wo",
  "welche",
  "welcher",
  "welches",
  "wer",
  "warum",
  "wieso",
  "ob",
  "gibt",
  "ist",
  "sind",
  "beginnt",
  "startet",
  "findet",
  "habe",
  "hab",
  "hast",
]);

function istAenderung(text: string) {
  const w = zerlege(text);
  const satz = ` ${w.klein.join(" ")} `;
  if (AENDERN.test(satz)) return true;
  // „Training ist ab jetzt immer um 19 Uhr“: Feststellung mit Uhrzeit, keine Frage
  return (
    FESTSTELLUNG.test(satz) &&
    findeUhrzeiten(w).length > 0 &&
    !text.trim().endsWith("?") &&
    !FRAGE_ANFANG.has(w.klein[0] ?? "")
  );
}

export const terminAendern: DemoRegel = {
  werkzeuge: ["termin_aendern", "termine_suchen", "termine_am_tag"],
  erkenne(text, jetzt) {
    if (!istAenderung(text)) return null;
    const v = verstehe(text, jetzt);
    if (v.such.klein.length === 0) {
      return sage(
        "Welchen Termin soll ich ändern? Sag es mir zum Beispiel so: „Verschieb Laufen im Park auf 19 Uhr“.",
      );
    }
    if (!v.zielTag && !v.zielZeit) {
      return sage(
        `Wohin soll ich „${v.such.anzeige}“ verschieben? Nenn mir eine Uhrzeit oder einen Wochentag, zum Beispiel „Verschieb ${v.such.anzeige} auf 19 Uhr“.`,
      );
    }
    return lies(v);
  },
  weiter(schritt, text, jetzt) {
    if (schritt.name !== "termin_aendern") {
      const v = verstehe(text, jetzt);
      const wahl = waehle(schritt, v, jetzt);
      if ("antwort" in wahl) return wahl.antwort;
      // Nur Uhrzeit genannt: Der Tag bleibt. Nur Tag genannt: Die Uhrzeit bleibt.
      const alt = new Date(wahl.termin.beginn);
      const { stunde, minute } = v.zielZeit ?? berlinTeile(alt);
      const beginn = berlinZeitpunkt(
        v.zielTag ?? berlinDatum(alt),
        stunde,
        minute,
      );
      return rufe("termin_aendern", {
        ...zielVon(wahl.termin, v.umfang),
        beginn: beginn.toISOString(),
      });
    }

    const { ausgang } = schritt;
    if (ausgang.art === "abgelehnt") {
      return sage("In Ordnung, der Termin bleibt, wie er war.");
    }
    if (ausgang.art === "fehler") {
      return sage(`Das ging nicht: ${ausgang.meldung}`);
    }
    const { termin, umfang } = ausgang.ergebnis as TerminAendernErgebnis;
    const beginn = new Date(termin.beginn);
    const tag = formatiereTag(berlinDatum(beginn));
    const zeit = formatiereUhrzeit(beginn);
    if (umfang === "nur_dieses_mal") {
      return sage(
        `Erledigt: „${termin.titel}“ steht nur am ${tag}, um ${zeit} Uhr im Demo-Kalender. In den anderen Wochen bleibt der Termin, wie er war.`,
      );
    }
    if (umfang === "ab_diesem_termin") {
      return sage(
        `Erledigt: „${termin.titel}“ steht ab ${tag}, jede Woche um ${zeit} Uhr im Demo-Kalender. Frühere Termine bleiben, wie sie waren.`,
      );
    }
    return sage(
      `Erledigt: „${termin.titel}“ steht jetzt am ${tag}, um ${zeit} Uhr im Demo-Kalender.`,
    );
  },
};

// ---------- Absagen ----------

function istAbsage(text: string) {
  const satz = ` ${zerlege(text).klein.join(" ")} `;
  return (
    (/ (sag|sage) /.test(satz) && satz.endsWith(" ab ")) ||
    / (absagen|streich|streiche|streichen|lösch|lösche|löschen|entfern|entferne|entfernen) /.test(
      satz,
    ) ||
    (/ (fällt|fallen) /.test(satz) && / aus /.test(satz))
  );
}

export const terminAbsagen: DemoRegel = {
  werkzeuge: ["termin_absagen", "termine_suchen", "termine_am_tag"],
  erkenne(text, jetzt) {
    if (!istAbsage(text)) return null;
    const v = verstehe(text, jetzt);
    if (v.such.klein.length === 0) {
      return sage(
        "Welchen Termin soll ich absagen? Sag es mir zum Beispiel so: „Sag Training am Dienstag ab“.",
      );
    }
    return lies(v);
  },
  weiter(schritt, text, jetzt) {
    if (schritt.name !== "termin_absagen") {
      const v = verstehe(text, jetzt);
      const wahl = waehle(schritt, v, jetzt);
      if ("antwort" in wahl) return wahl.antwort;
      return rufe("termin_absagen", zielVon(wahl.termin, v.umfang));
    }

    const { ausgang } = schritt;
    if (ausgang.art === "abgelehnt") {
      return sage("In Ordnung, der Termin bleibt im Demo-Kalender.");
    }
    if (ausgang.art === "fehler") {
      return sage(`Das ging nicht: ${ausgang.meldung}`);
    }
    const { termin, umfang, ganzeSerie } =
      ausgang.ergebnis as TerminAbsagenErgebnis;
    const tag = formatiereTag(
      termin.vorkommen ?? berlinDatum(new Date(termin.beginn)),
    );
    if (umfang === "nur_dieses_mal") {
      return sage(
        `Erledigt: „${termin.titel}“ fällt am ${tag}, aus. In den anderen Wochen bleibt der Termin im Demo-Kalender.`,
      );
    }
    if (ganzeSerie) {
      return sage(
        `Erledigt: „${termin.titel}“ ist ganz aus dem Demo-Kalender entfernt.`,
      );
    }
    if (umfang === "ab_diesem_termin") {
      return sage(
        `Erledigt: „${termin.titel}“ ist ab ${tag}, aus dem Demo-Kalender entfernt. Frühere Termine bleiben.`,
      );
    }
    return sage(
      `Erledigt: „${termin.titel}“ am ${tag}, ist aus dem Demo-Kalender entfernt.`,
    );
  },
};

// ---------- Suchen ----------

/** Wörter einer „Wann …?“-Frage, die nicht zum Titel gehören. */
const WANN_WOERTER = new Set([
  "wann",
  "ist",
  "sind",
  "habe",
  "hab",
  "ich",
  "das",
  "der",
  "die",
  "den",
  "mein",
  "meine",
  "nächste",
  "nächstes",
  "nächster",
  "wieder",
  "findet",
  "statt",
  "beginnt",
  "termin",
  "kommt",
  "denn",
  "eigentlich",
  "jarvis",
]);

/** „Wann ist Training?“: alle passenden Termine der nächsten 30 Tage. Ändert nichts. */
export const termineSuchen: DemoRegel = {
  werkzeuge: ["termine_suchen"],
  erkenne(text, jetzt) {
    const w = zerlege(text);
    if (!w.klein.includes("wann")) return null;
    const verbraucht = new Set(
      [...findeTage(w, jetzt), ...findeUhrzeiten(w)].flatMap(
        (f) => f.positionen,
      ),
    );
    const such = w.original.filter(
      (_, i) => !verbraucht.has(i) && !WANN_WOERTER.has(w.klein[i]!),
    );
    if (such.length === 0) return null;
    return rufe("termine_suchen", { text: such.join(" ").slice(0, 100) });
  },
  weiter({ ausgang }) {
    if (ausgang.art !== "ergebnis") {
      return sage("Den Demo-Kalender konnte ich gerade nicht lesen.");
    }
    const { text, bis, termine } = ausgang.ergebnis as TermineSuchenErgebnis;
    if (termine.length === 0) {
      return sage(
        `Im Demo-Kalender finde ich bis ${formatiereTag(bis)}, keinen Termin zu „${text}“.`,
      );
    }
    const zeilen = termine.map((t) => {
      const beginn = new Date(t.beginn);
      return `• ${formatiereTag(berlinDatum(beginn))}, ${formatiereUhrzeit(beginn)}–${formatiereUhrzeit(new Date(t.ende))} Uhr: ${t.titel}`;
    });
    const anzahl =
      termine.length === 1 ? "1 Termin" : `${termine.length} Termine`;
    return sage(
      `Bis ${formatiereTag(bis)} finde ich im Demo-Kalender ${anzahl} zu „${text}“:\n${zeilen.join("\n")}`,
    );
  },
};
