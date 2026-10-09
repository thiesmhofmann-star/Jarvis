"use client";

import { useEffect } from "react";
import { FehlerAnzeige } from "@/components/fehler-anzeige";
import "./globals.css";

// Letzte Rettung, wenn sogar das Layout scheitert. Ersetzt das ganze Dokument,
// darum eigenes <html> und <body> und keine Tab-Leiste.
export default function GlobalerFehler({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="de">
      <body className="flex min-h-dvh flex-col">
        <title>Fehler – Jarvis</title>
        <FehlerAnzeige erneutVersuchen={retry} />
      </body>
    </html>
  );
}
