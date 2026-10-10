"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AktionsStatus } from "@/core/guard/aktionen";
import type { FreigabeAnsicht } from "@/core/assistant/eintraege";
import { knopfKlassen, knopfZweitKlassen } from "../knopf";

const STATUS_TEXT: Record<Exclude<AktionsStatus, "offen">, string> = {
  freigegeben: "Freigegeben – wird ausgeführt …",
  erledigt: "Freigegeben und ausgeführt.",
  abgelehnt: "Abgelehnt – es wurde nichts geändert.",
  fehlgeschlagen: "Freigegeben, aber das hat nicht geklappt.",
};

/**
 * Freigabe-Karte der Schutzschicht: zeigt, was passieren würde und mit
 * welchen Daten. Erst „Freigeben“ führt die Aktion aus.
 */
export function FreigabeKarte({
  aktion,
  entscheiden,
  gesperrt,
}: {
  aktion: FreigabeAnsicht;
  entscheiden: (
    aktionId: string,
    entscheidung: "freigeben" | "ablehnen",
  ) => void;
  gesperrt: boolean;
}) {
  const titelId = useId();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const [selbstEntschieden, setSelbstEntschieden] = useState(false);

  // Die Knöpfe verschwinden nach der Entscheidung. Damit der Fokus nicht
  // verloren geht, springt er auf die Statuszeile.
  useEffect(() => {
    if (selbstEntschieden && aktion.status !== "offen")
      statusRef.current?.focus();
  }, [aktion.status, selbstEntschieden]);

  function waehle(entscheidung: "freigeben" | "ablehnen") {
    setSelbstEntschieden(true);
    entscheiden(aktion.id, entscheidung);
  }

  return (
    <section
      aria-labelledby={titelId}
      className="flex w-full flex-col gap-mittel rounded-gross border border-rand bg-hintergrund p-mittel"
    >
      <div className="flex flex-col gap-sehr-klein">
        <p className="text-klein font-fett text-akzent">Freigabe nötig</p>
        <h2 id={titelId} className="text-gross font-fett">
          {aktion.vorschau.titel}
        </h2>
        <p className="text-text-gedaempft">{aktion.vorschau.beschreibung}</p>
      </div>
      <dl className="flex flex-col gap-sehr-klein">
        {aktion.vorschau.daten.map(({ label, wert }) => (
          <div key={label} className="flex flex-wrap gap-klein">
            <dt className="text-text-gedaempft">{label}:</dt>
            <dd className="font-fett">{wert}</dd>
          </div>
        ))}
      </dl>
      {aktion.status === "offen" ? (
        <div className="flex flex-wrap gap-klein">
          <button
            type="button"
            className={knopfKlassen}
            disabled={gesperrt}
            onClick={() => waehle("freigeben")}
          >
            Freigeben
          </button>
          <button
            type="button"
            className={knopfZweitKlassen}
            disabled={gesperrt}
            onClick={() => waehle("ablehnen")}
          >
            Ablehnen
          </button>
        </div>
      ) : (
        <p
          ref={statusRef}
          tabIndex={-1}
          className={
            aktion.status === "fehlgeschlagen"
              ? "text-fehler"
              : "text-text-gedaempft"
          }
        >
          {STATUS_TEXT[aktion.status]}
        </p>
      )}
    </section>
  );
}
