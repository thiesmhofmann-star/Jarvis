import { knopfKlassen } from "./knopf";
import { Seite } from "./seite";

/** Gemeinsame Fehleranzeige für error.tsx und global-error.tsx. */
export function FehlerAnzeige({
  erneutVersuchen,
}: {
  erneutVersuchen: () => void;
}) {
  return (
    <Seite titel="Etwas ist schiefgelaufen">
      <div className="flex flex-col items-start gap-mittel">
        <p className="text-fehler">Diese Seite konnte nicht geladen werden.</p>
        <p className="text-text-gedaempft">
          Oft hilft es, es einfach noch einmal zu versuchen.
        </p>
        <button
          type="button"
          onClick={erneutVersuchen}
          className={knopfKlassen}
        >
          Erneut versuchen
        </button>
      </div>
    </Seite>
  );
}
