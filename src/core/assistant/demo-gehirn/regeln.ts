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
 * - Aufgaben pflegen zuerst: „Frist“ und „Aufgabe … löschen“ sind eindeutig,
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
  aufgabeAendern,
  aufgabeLoeschen,
  erledigteAnzeigen,
  aufgabeWiederOeffnen,
  aufgabeErledigen,
  aufgabeAnlegen,
  terminAnlegen,
  terminAbsagen,
  terminAendern,
  tagesueberblick,
  aufgabenAnzeigen,
  termineSuchen,
  termineAmTag,
];
