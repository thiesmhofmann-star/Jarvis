import type { AktionsStatus } from "@/core/guard/aktionen";
import type { ActionPreview } from "@/modules/vertrag";

/**
 * Was der Server an die Oberfläche schickt. Nur Typen und eine Konstante,
 * damit der Browser keinen Server-Code mitlädt.
 */
/** Höchstlänge einer Nachricht; Browser und Server prüfen dieselbe Grenze. */
export const MAX_NACHRICHT_LAENGE = 2000;

export type FreigabeAnsicht = {
  id: string;
  vorschau: ActionPreview;
  status: AktionsStatus;
};

export type ChatEintrag =
  | { art: "jarvis"; text: string }
  | { art: "freigabe"; aktion: FreigabeAnsicht };

export type NachrichtAntwort = { eintraege: ChatEintrag[] };
export type EntscheidungAntwort = {
  aktion: FreigabeAnsicht;
  eintraege: ChatEintrag[];
};
export type FehlerAntwort = { fehler: string };
