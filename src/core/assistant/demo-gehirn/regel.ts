import type { GehirnAntwort, Nachricht } from "../gehirn";

/** Ein gelaufener (oder abgelehnter) Werkzeug-Aufruf im Verlauf. */
export type WerkzeugSchritt = Extract<Nachricht, { rolle: "werkzeug" }>;

/**
 * Eine feste Regel, mit der das Demo-Gehirn Claude spielt. Claude erkennt das
 * passende Werkzeug später an dessen Beschreibung; das Demo-Gehirn braucht
 * dafür Schlüsselwörter. Im Demo-Modus braucht deshalb jedes Modul eigene
 * Regeln hier. Sie verschwinden mit dem Demo-Gehirn.
 */
export type DemoRegel = {
  /** Werkzeuge der Regel, das wichtigste zuerst. Sie greift nur, wenn alle angeboten werden. */
  werkzeuge: readonly string[];
  /** Erster Schritt zu einer Nachricht von Thies, oder null, wenn die Regel nicht passt. */
  erkenne(text: string, jetzt: Date): GehirnAntwort | null;
  /** Nächster Schritt, nachdem eines ihrer Werkzeuge gelaufen ist: Antwort oder weiterer Aufruf. */
  weiter(schritt: WerkzeugSchritt, text: string, jetzt: Date): GehirnAntwort;
};

export const sage = (text: string): GehirnAntwort => ({ art: "text", text });

export const rufe = (name: string, eingabe: unknown): GehirnAntwort => ({
  art: "werkzeug",
  name,
  eingabe,
});

/** Großer Anfangsbuchstabe, wie bei einem Titel üblich. */
export function alsTitel(woerter: string[]) {
  const text = woerter.join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
