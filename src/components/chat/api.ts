import type { ChatAnfrage } from "@/core/assistant/anfrage";
import type {
  EntscheidungAntwort,
  FehlerAntwort,
  NachrichtAntwort,
} from "@/core/assistant/eintraege";

export const MELDUNG_VERBINDUNG =
  "Keine Verbindung zu Jarvis. Prüf dein Internet und versuch es noch einmal.";
export const MELDUNG_ALLGEMEIN =
  "Jarvis konnte gerade nicht antworten. Bitte versuch es noch einmal.";

/** Fehler mit einer Meldung, die so in der Oberfläche stehen darf. */
export class ChatFehler extends Error {}

/** Schickt eine Anfrage an /api/chat. Fehler kommen als deutsche Meldung zurück. */
async function frage<T>(anfrage: ChatAnfrage): Promise<T> {
  let antwort: Response;
  try {
    antwort = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(anfrage),
    });
  } catch {
    throw new ChatFehler(MELDUNG_VERBINDUNG);
  }
  const daten = (await antwort.json().catch(() => null)) as
    T | FehlerAntwort | null;
  if (!antwort.ok || daten === null) {
    const meldung =
      daten && typeof daten === "object" && "fehler" in daten
        ? daten.fehler
        : MELDUNG_ALLGEMEIN;
    throw new ChatFehler(meldung);
  }
  return daten as T;
}

export function sendeNachricht(sitzung: string, text: string) {
  return frage<NachrichtAntwort>({ art: "nachricht", sitzung, text });
}

export function sendeEntscheidung(
  sitzung: string,
  aktionId: string,
  entscheidung: "freigeben" | "ablehnen",
) {
  return frage<EntscheidungAntwort>({
    art: "entscheidung",
    sitzung,
    aktionId,
    entscheidung,
  });
}
