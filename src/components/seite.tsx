import type { ReactNode } from "react";

/**
 * Rahmen jeder Seite: Kopfzeile mit Seitentitel und der Hauptinhalt.
 * `id="inhalt"` ist das Ziel des Sprunglinks „Zum Inhalt“ im Layout.
 * `unten` klebt am unteren Rand direkt über der Tab-Leiste (z. B. die
 * Chat-Eingabe).
 */
export function Seite({
  titel,
  children,
  unten,
}: {
  titel: string;
  children: ReactNode;
  unten?: ReactNode;
}) {
  return (
    <>
      <header className="px-sicher pt-sicher">
        <div className="mx-auto max-w-inhalt">
          <h1 className="text-titel font-fett">{titel}</h1>
        </div>
      </header>
      <main id="inhalt" tabIndex={-1} className="flex flex-1 flex-col">
        <div className="flex-1 px-sicher py-gross">
          <div className="mx-auto max-w-inhalt">{children}</div>
        </div>
        {unten && (
          <div className="sticky ueber-tab-leiste border-t border-rand bg-hintergrund px-sicher py-klein">
            <div className="mx-auto max-w-inhalt">{unten}</div>
          </div>
        )}
      </main>
    </>
  );
}
