import {
  aufgabeAendern,
  aufgabeLoeschen,
  aufgabeWiederOeffnen,
  erledigteAnzeigen,
} from "./aufgaben-pflege-regeln";
import {
  aufgabeAnlegen,
  aufgabeErledigen,
  aufgabenAnzeigen,
} from "./aufgaben-regeln";
import { terminAnlegen, termineAmTag } from "./kalender-regeln";
import { ausMailUebernehmen } from "./mail-uebernahme-regeln";
import { notizAnlegen, notizenAnzeigen, notizLoeschen } from "./notizen-regeln";
import {
  antwortEntwurf,
  entwuerfeAnzeigen,
  mailLesen,
  mailsAnzeigen,
  mailsZusammenfassen,
  wichtigeMails,
} from "./posteingang-regeln";
import { kalenderAufraeumen } from "./aufraeum-regeln";
import type { DemoRegel } from "./regel";
import { abendrueckblick, tagesueberblick } from "./ueberblick-regeln";
import {
  terminAbsagen,
  terminAendern,
  termineSuchen,
} from "./termin-pflege-regeln";

/**
 * Alle Regeln des Demo-Gehirns. Die Reihenfolge zählt, die erste passende
 * gewinnt:
 * - Kalender aufräumen ganz vorn: Mitten im Durchgang sind „passt“ oder
 *   „ab jetzt 19 Uhr“ Antworten auf seine Frage,
 * - „Mach aus der Mail … eine Aufgabe“ vor allen Aufgaben- und Termin-Sätzen,
 * - „Antworte …: …“ und „Notiz: …“ ganz vorn, der Text darf alles enthalten,
 * - Mail-Sätze nach den Termin-Sätzen („Trag Mail schreiben … ein“ ist ein Termin),
 * - Aufgaben pflegen vor dem Abhaken: „Frist“ und „Aufgabe … löschen“ sind eindeutig,
 *   „Was habe ich erledigt?“ und „… ist doch nicht erledigt“ vor dem Abhaken,
 * - „… ist erledigt“ vor allem anderen,
 * - „Neue Aufgabe …“ vor „Trag … ein“ (Aufgabe statt Termin),
 * - „Trag einen Termin ein“ vor „Termine“,
 * - Absagen vor Ändern („Training fällt ab jetzt immer aus“ ist eine Absage),
 * - Tagesüberblick vor den einzelnen Listen („Guten Morgen, was steht an?“),
 * - „Wann ist … fällig?“ (Aufgaben) vor „Wann ist …?“ (Termine),
 * - „Was ist fällig?“ vor „Was steht an?“.
 */
export const demoRegeln: readonly DemoRegel[] = [
  kalenderAufraeumen,
  antwortEntwurf,
  ausMailUebernehmen,
  notizAnlegen,
  notizLoeschen,
  notizenAnzeigen,
  aufgabeAendern,
  aufgabeLoeschen,
  erledigteAnzeigen,
  aufgabeWiederOeffnen,
  aufgabeErledigen,
  aufgabeAnlegen,
  terminAnlegen,
  terminAbsagen,
  terminAendern,
  entwuerfeAnzeigen,
  wichtigeMails,
  mailsZusammenfassen,
  mailLesen,
  mailsAnzeigen,
  abendrueckblick,
  tagesueberblick,
  aufgabenAnzeigen,
  termineSuchen,
  termineAmTag,
];
