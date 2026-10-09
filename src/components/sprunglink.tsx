"use client";

/**
 * „Zum Inhalt“: erster Link der Seite, nur sichtbar, wenn er den Fokus hat.
 * Setzt den Fokus selbst auf den Inhalt, weil Safari das beim Sprung zu
 * #inhalt nicht zuverlässig tut. Ohne JavaScript bleibt der normale Sprung.
 */
export function Sprunglink() {
  return (
    <a
      href="#inhalt"
      onClick={() => document.getElementById("inhalt")?.focus()}
      className="sr-only focus:not-sr-only focus:m-mittel focus:inline-flex focus:min-h-tippflaeche focus:items-center focus:self-start focus:rounded-klein focus:bg-akzent focus:px-mittel focus:text-auf-akzent"
    >
      Zum Inhalt
    </a>
  );
}
