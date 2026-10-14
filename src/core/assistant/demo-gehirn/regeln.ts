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
import {
  antwortEntwurf,
  entwuerfeAnzeigen,
  mailLesen,
  mailsAnzeigen,
} from "./posteingang-regeln";
import type { DemoRegel } from "./regel";
import { tagesueberblick } from "./ueberblick-regeln";
import {
  terminAbsagen,
  terminAendern,
  termineSuchen,
} from "./termin-pflege-regeln";

/**
 * Alle Regeln des Demo-Gehirns. Die Reihenfolge zählt, die erste passende
 * gewinnt:
 * - „Antworte …: …“ ganz vorn, der Text darf alles enthalten,
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
  antwortEntwurf,
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
  mailLesen,
  mailsAnzeigen,
  tagesueberblick,
  aufgabenAnzeigen,
  termineSuchen,
  termineAmTag,
];
