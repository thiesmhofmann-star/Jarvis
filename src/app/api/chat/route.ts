import { chatAnfrage } from "@/core/assistant/anfrage";
import type {
  EntscheidungAntwort,
  FehlerAntwort,
  NachrichtAntwort,
} from "@/core/assistant/eintraege";
import { jarvis } from "@/core/assistant/jarvis";

function fehler(meldung: string, status: number) {
  return Response.json({ fehler: meldung } satisfies FehlerAntwort, { status });
}

/**
 * Eine einzige Route für Nachrichten und Freigaben. So teilen sich beide
 * denselben Arbeitsspeicher (Verlauf, ausstehende Aktionen).
 */
export async function POST(request: Request) {
  const anfrage = chatAnfrage.safeParse(await request.json().catch(() => null));
  if (!anfrage.success) {
    return fehler("Die Nachricht ist leer, zu lang oder unvollständig.", 400);
  }

  // Im Demo-Modus ist die zufällige Sitzungs-ID des Browsers der „Nutzer“.
  const ctx = { nutzerId: anfrage.data.sitzung, jetzt: new Date() };

  try {
    if (anfrage.data.art === "nachricht") {
      const eintraege = await jarvis.sende(anfrage.data.text, ctx);
      return Response.json({ eintraege } satisfies NachrichtAntwort);
    }

    const ausgang = await jarvis.entscheide(
      anfrage.data.aktionId,
      anfrage.data.entscheidung,
      ctx,
    );
    if (ausgang.art === "fehler") {
      return fehler(ausgang.meldung, ausgang.grund === "unbekannt" ? 404 : 409);
    }
    return Response.json({
      aktion: ausgang.aktion,
      eintraege: ausgang.eintraege,
    } satisfies EntscheidungAntwort);
  } catch (ursache) {
    console.error(ursache);
    return fehler(
      "Jarvis konnte gerade nicht antworten. Bitte versuch es noch einmal.",
      500,
    );
  }
}
