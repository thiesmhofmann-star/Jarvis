import type { ReactNode } from "react";

/**
 * Rahmen jeder Seite: Kopfzeile mit Seitentitel und der Hauptinhalt.
 * `id="inhalt"` ist das Ziel des Sprunglinks „Zum Inhalt“ im Layout.
 */
export function Seite({
  titel,
  children,
}: {
  titel: string;
  children: ReactNode;
}) {
  return (
    <>
      <header className="px-sicher pt-sicher">
        <div className="mx-auto max-w-inhalt">
          <h1 className="text-titel font-fett">{titel}</h1>
        </div>
      </header>
      <main id="inhalt" tabIndex={-1} className="flex-1 px-sicher py-gross">
        <div className="mx-auto max-w-inhalt">{children}</div>
      </main>
    </>
  );
}
