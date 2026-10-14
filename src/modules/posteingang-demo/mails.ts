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
  demo: true;
};

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

/** Erfundene Mails der letzten Tage, bezogen auf den Start der Sitzung. */
function beispielmails(jetzt: Date): Mail[] {
  const heute = berlinDatum(jetzt);
  const mail = (
    von: string,
    adresse: string,
    betreff: string,
    text: string,
    tageZurueck: number,
    [stunde, minute]: [number, number],
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
    demo: true,
  });
  return [
    mail(
      "Hausverwaltung Sonnenhof",
      "service@hausverwaltung-sonnenhof.example",
      "Wartung der Heizung am Donnerstag",
      "Hallo, am Donnerstag zwischen 8 und 12 Uhr kommt der Techniker für die jährliche Heizungswartung. Bitte halten Sie die Heizkörper frei zugänglich. Passt Ihnen der Termin? Viele Grüße, Ihre Hausverwaltung",
      0,
      [7, 45],
    ),
    mail(
      "Fahrradladen Speiche",
      "werkstatt@speiche.example",
      "Dein Fahrrad ist fertig",
      "Hi, die Reparatur ist erledigt: neuer Schlauch und Bremsen eingestellt. Du kannst das Rad ab heute zu unseren Öffnungszeiten abholen. Bis bald, dein Speiche-Team",
      0,
      [7, 10],
    ),
    mail(
      "Lena Berger",
      "lena.berger@beispiel.example",
      "Unterlagen für Montag",
      "Hallo, kannst du mir die Unterlagen für die Besprechung am Montag bis Freitag schicken? Danke dir! Lena",
      1,
      [17, 40],
    ),
    mail(
      "Stadtbibliothek",
      "ausleihe@stadtbibliothek.example",
      "Erinnerung: Leihfrist abgelaufen",
      "Guten Tag, die Leihfrist für Ihr Buch ist abgelaufen. Bitte geben Sie es bald zurück oder verlängern Sie die Ausleihe. Ihre Stadtbibliothek",
      2,
      [9, 0],
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
