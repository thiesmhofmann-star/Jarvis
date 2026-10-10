"use client";

import { MAX_NACHRICHT_LAENGE } from "@/core/assistant/eintraege";
import { knopfKlassen } from "../knopf";

/**
 * Eingabe unten über der Tab-Leiste. Ein mehrzeiliges Textfeld, damit das
 * Diktat der iPhone-Tastatur bequem funktioniert. Enter schickt ab,
 * Umschalt+Enter macht eine neue Zeile.
 */
export function Eingabe({
  wert,
  aendern,
  senden,
  bereit,
  denkt,
}: {
  wert: string;
  aendern: (wert: string) => void;
  senden: () => void;
  /** Erst nach der Hydration bedienbar */
  bereit: boolean;
  /** Solange Jarvis denkt, geht keine zweite Nachricht raus; schreiben geht weiter. */
  denkt: boolean;
}) {
  return (
    <form
      className="flex items-end gap-klein"
      onSubmit={(ereignis) => {
        ereignis.preventDefault();
        senden();
      }}
    >
      <label htmlFor="chat-eingabe" className="sr-only">
        Nachricht an Jarvis
      </label>
      <textarea
        id="chat-eingabe"
        value={wert}
        onChange={(ereignis) => aendern(ereignis.target.value)}
        onKeyDown={(ereignis) => {
          if (
            ereignis.key === "Enter" &&
            !ereignis.shiftKey &&
            !ereignis.nativeEvent.isComposing
          ) {
            ereignis.preventDefault();
            senden();
          }
        }}
        rows={2}
        maxLength={MAX_NACHRICHT_LAENGE}
        placeholder="Nachricht an Jarvis …"
        disabled={!bereit}
        enterKeyHint="send"
        autoComplete="off"
        className="min-h-tippflaeche max-h-eingabe-max min-w-0 flex-1 resize-none rounded-klein border border-rand bg-hintergrund px-mittel py-klein text-normal text-text field-sizing-content placeholder:text-text-gedaempft"
      />
      <button
        type="submit"
        disabled={!bereit || denkt}
        className={knopfKlassen}
      >
        Senden
      </button>
    </form>
  );
}
