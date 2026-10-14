import {
  aufgabeAnlegen,
  aufgabeErledigen,
  aufgabenAnzeigen,
} from "./aufgaben-regeln";
import { terminAnlegen, termineAmTag } from "./kalender-regeln";
import type { DemoRegel } from "./regel";
import {
  terminAbsagen,
  terminAendern,
  termineSuchen,
} from "./termin-pflege-regeln";

/**
 * Alle Regeln des Demo-Gehirns. Die Reihenfolge zählt, die erste passende
 * gewinnt:
 * - „… ist erledigt“ vor allem anderen,
 * - „Neue Aufgabe …“ vor „Trag … ein“ (Aufgabe statt Termin),
 * - „Trag einen Termin ein“ vor „Termine“,
 * - Absagen vor Ändern („Training fällt ab jetzt immer aus“ ist eine Absage),
 * - „Wann ist … fällig?“ (Aufgaben) vor „Wann ist …?“ (Termine),
 * - „Was ist fällig?“ vor „Was steht an?“.
 */
export const demoRegeln: readonly DemoRegel[] = [
  aufgabeErledigen,
  aufgabeAnlegen,
  terminAnlegen,
  terminAbsagen,
  terminAendern,
  aufgabenAnzeigen,
  termineSuchen,
  termineAmTag,
];
