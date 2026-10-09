/**
 * Die Bereiche der App, wie sie in der Tab-Leiste erscheinen.
 * Ein neues Modul mit eigener Ansicht ergänzt hier einen Eintrag.
 */
export type Bereich = {
  href: string;
  titel: string;
  symbol: "chat" | "einstellungen";
};

export const bereiche: readonly Bereich[] = [
  { href: "/", titel: "Jarvis", symbol: "chat" },
  { href: "/einstellungen", titel: "Einstellungen", symbol: "einstellungen" },
];

/** Ein Bereich ist aktiv auf seiner eigenen Adresse und auf allen Unterseiten. */
export function istAktiv(href: string, pfad: string): boolean {
  if (href === "/") return pfad === "/";
  return pfad === href || pfad.startsWith(`${href}/`);
}
