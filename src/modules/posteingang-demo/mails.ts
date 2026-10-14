import { sitzungsSpeicher } from "@/lib/sitzungs-speicher";
import { berlinDatum, berlinZeitpunkt, tagePlus } from "@/lib/zeit";

/**
 * Eine Mail im Demo-Posteingang. Alles erfunden: Absender und Adressen
 * enden auf „.example“, eine Endung, die es im Internet nie geben wird.
 */
export type Mail = {
  id: string;
  /** Anzeigename, z. B. „Hausverwaltung Sonnenhof“ */
  von: string;
  adresse: string;
  betreff: string;
  text: string;
  empfangen: string; // ISO-Zeitpunkt
  /**
   * Einordnung, Grund und Kurzfassung (Ticket H). Im Demo-Modus stehen sie
   * vorbereitet in den Daten. Im Anschluss-Block liefert Gmail sie nicht;
   * dann ordnet Claude jede Mail selbst ein und nennt den Grund.
   */
  einordnung: Einordnung;
  /** Warum diese Einordnung, in einem Satz. Sichtbar, damit Thies sie prüfen kann. */
  grund: string;
  /** Worum es geht, in einer Zeile */
  kurzfassung: string;
  demo: true;
};

/** „braucht dich heute“, „kann warten“ oder „egal“ */
export type Einordnung = "heute" | "warten" | "egal";

/** Ein Antwort-Entwurf. Er wird nie gesendet. */
export type Entwurf = {
  id: string;
  mailId: string;
  an: string;
  betreff: string;
  text: string;
  erstellt: string; // ISO-Zeitpunkt
  demo: true;
};

/** „24.10.“ */
function kurzesDatum(datum: string) {
  const [, monat, tag] = datum.split("-").map(Number);
  return `${tag}.${monat}.`;
}

/** Erfundene Mails der letzten Tage, bezogen auf den Start der Sitzung. */
function beispielmails(jetzt: Date): Mail[] {
  const heute = berlinDatum(jetzt);
  const mail = (
    [von, adresse]: [string, string],
    betreff: string,
    text: string,
    [tageZurueck, stunde, minute]: [number, number, number],
    [einordnung, grund, kurzfassung]: [Einordnung, string, string],
  ): Mail => ({
    id: crypto.randomUUID(),
    von,
    adresse,
    betreff,
    text,
    empfangen: berlinZeitpunkt(
      tagePlus(heute, -tageZurueck),
      stunde,
      minute,
    ).toISOString(),
    einordnung,
    grund,
    kurzfassung,
    demo: true,
  });
  const kontrolltermin = kurzesDatum(tagePlus(heute, 14));
  return [
    mail(
      ["Hausverwaltung Sonnenhof", "service@hausverwaltung-sonnenhof.example"],
      "Wartung der Heizung am Donnerstag",
      "Hallo, am Donnerstag um 8 Uhr kommt der Techniker für die jährliche Heizungswartung, er bleibt bis etwa 12 Uhr. Bitte halten Sie die Heizkörper frei zugänglich. Passt Ihnen der Termin? Viele Grüße, Ihre Hausverwaltung",
      [0, 7, 45],
      [
        "heute",
        "Die Hausverwaltung fragt, ob der Termin passt, und wartet auf deine Antwort.",
        "Heizungswartung am Donnerstag ab 8 Uhr, bitte bestätigen.",
      ],
    ),
    mail(
      ["Fahrradladen Speiche", "werkstatt@speiche.example"],
      "Dein Fahrrad ist fertig",
      "Hi, die Reparatur ist erledigt: neuer Schlauch und Bremsen eingestellt. Du kannst das Rad ab heute zu unseren Öffnungszeiten abholen. Bis bald, dein Speiche-Team",
      [0, 7, 10],
      [
        "warten",
        "Das Rad liegt bereit, eine Frist zum Abholen nennen sie nicht.",
        "Reparatur fertig, das Rad kann abgeholt werden.",
      ],
    ),
    mail(
      ["Wochenmarkt Neustadt", "newsletter@wochenmarkt-neustadt.example"],
      "Kürbiswochen auf dem Markt",
      "Liebe Marktfreunde, ab Samstag gibt es frische Kürbisse, Äpfel und Most. Wir freuen uns auf Ihren Besuch!",
      [0, 6, 5],
      [
        "egal",
        "Ein Newsletter mit Angeboten, niemand erwartet etwas von dir.",
        "Herbstangebote: Kürbisse, Äpfel und Most.",
      ],
    ),
    mail(
      ["Gewinnspiel-Team", "gewinn@super-preise.example"],
      "Sie haben gewonnen!!!",
      "Herzlichen Glückwunsch! Sie wurden als Gewinner ausgewählt. Klicken Sie jetzt auf den Link und geben Sie Ihre Bankdaten ein, um Ihren Preis zu erhalten.",
      [1, 22, 15],
      [
        "egal",
        "Ein unbekannter Absender verspricht einen Gewinn und will Bankdaten, typisch für Spam.",
        "Angeblicher Gewinn, bitte nichts anklicken.",
      ],
    ),
    mail(
      ["Lena Berger", "lena.berger@beispiel.example"],
      "Unterlagen für Montag",
      "Hallo, kannst du mir die Unterlagen für die Besprechung am Montag bis Freitag schicken? Danke dir! Lena",
      [1, 17, 40],
      [
        "heute",
        "Lena braucht die Unterlagen bis Freitag, und am Montag ist schon die Besprechung.",
        "Bittet um die Unterlagen für Montag, bis Freitag.",
      ],
    ),
    mail(
      ["Praxis am Markt", "termine@praxis-am-markt.example"],
      "Ihr Kontrolltermin",
      `Guten Tag, wir bestätigen Ihren Kontrolltermin am ${kontrolltermin} um 9:30 Uhr. Bitte bringen Sie Ihre Versichertenkarte mit. Ihre Praxis am Markt`,
      [1, 9, 30],
      [
        "warten",
        "Der Termin ist erst in zwei Wochen und schon bestätigt, du musst nichts tun.",
        `Kontrolltermin am ${kontrolltermin} um 9:30 Uhr ist bestätigt.`,
      ],
    ),
    mail(
      ["Stadtbibliothek", "ausleihe@stadtbibliothek.example"],
      "Erinnerung: Leihfrist abgelaufen",
      "Guten Tag, die Leihfrist für Ihr Buch ist abgelaufen. Bitte geben Sie es bald zurück oder verlängern Sie die Ausleihe. Ihre Stadtbibliothek",
      [2, 9, 0],
      [
        "heute",
        "Die Leihfrist ist schon abgelaufen; je länger das Buch liegt, desto höher die Gebühr.",
        "Buch überfällig, bitte zurückgeben oder verlängern.",
      ],
    ),
    mail(
      ["Stadtwerke", "kundenservice@stadtwerke.example"],
      "Ihr Abschlag für Strom",
      "Guten Tag, Ihr monatlicher Abschlag für Strom wird wie gewohnt zum Monatsanfang abgebucht. Sie müssen nichts tun. Ihre Stadtwerke",
      [3, 11, 0],
      [
        "warten",
        "Der Betrag wird automatisch abgebucht, du musst nichts tun.",
        "Stromabschlag wird wie immer abgebucht.",
      ],
    ),
  ];
}

// Jede Sitzung bekommt ihren eigenen Demo-Posteingang im Arbeitsspeicher.
// Er verschwindet mit der Sitzung; nichts wird dauerhaft gespeichert.
const posteingaenge = sitzungsSpeicher(() => ({
  mails: [] as Mail[],
  entwuerfe: [] as Entwurf[],
  befuellt: false,
}));

export function posteingangVon(nutzerId: string, jetzt: Date) {
  const eintrag = posteingaenge.hole(nutzerId);
  if (!eintrag.befuellt) {
    eintrag.mails.push(...beispielmails(jetzt));
    eintrag.befuellt = true;
  }
  return eintrag;
}

/** Obergrenze, damit niemand den Speicher der öffentlichen Demo füllen kann. */
export const MAX_ENTWUERFE = 20;
