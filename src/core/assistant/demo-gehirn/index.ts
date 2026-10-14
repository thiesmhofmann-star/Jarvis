import type { Gehirn, GehirnAntwort, Nachricht } from "../gehirn";
import { type DemoRegel, type WerkzeugSchritt, sage } from "./regel";
import { demoRegeln } from "./regeln";

export const DEMO_ANTWORT =
  "Das kann ich im Demo-Modus noch nicht. Gerade antworte ich mit vorbereiteten Texten und kenne nur den Demo-Kalender, die Demo-Aufgaben, den Demo-Posteingang und die Demo-Notizen. Probier zum Beispiel „Wie sieht mein Tag aus?“, „Trag Zahnarzt Freitag 10 Uhr ein“, „Verschieb Laufen im Park auf 19 Uhr“, „Neue Aufgabe: Steuererklärung abgeben bis Freitag“ oder „Was ist neu im Posteingang?“.";

/** Letzte Nachricht von Thies und die Werkzeug-Schritte, die seitdem gelaufen sind. */
function seitLetzterNachricht(verlauf: readonly Nachricht[]) {
  const schritte: WerkzeugSchritt[] = [];
  for (let i = verlauf.length - 1; i >= 0; i--) {
    const nachricht = verlauf[i]!;
    if (nachricht.rolle === "nutzer") return { text: nachricht.text, schritte };
    if (nachricht.rolle === "werkzeug") schritte.unshift(nachricht);
  }
  return { text: "", schritte };
}

/**
 * Das Demo-Gehirn: erkennt anhand fester Regeln, welches Werkzeug passt.
 * Es nutzt nur Werkzeuge, die ihm angeboten werden, genau wie später Claude.
 * Nach jedem Werkzeug-Schritt entscheidet die Regel, die zur Nachricht von
 * Thies passt, wie es weitergeht: antworten oder ein weiteres Werkzeug nutzen.
 */
export function erstelleDemoGehirn(
  regeln: readonly DemoRegel[] = demoRegeln,
): Gehirn {
  return {
    async antworte({ verlauf, werkzeuge, jetzt }): Promise<GehirnAntwort> {
      const angeboten = new Set(werkzeuge.map((w) => w.name));
      const nutzbar = regeln.filter((r) =>
        r.werkzeuge.every((name) => angeboten.has(name)),
      );
      const letzte = verlauf.at(-1);

      if (letzte?.rolle === "werkzeug") {
        const { text, schritte } = seitLetzterNachricht(verlauf);
        const regel =
          // die Regel, die die Nachricht von Thies behandelt hat …
          nutzbar.find(
            (r) =>
              r.werkzeuge.includes(letzte.name) &&
              r.erkenne(text, jetzt) !== null,
          ) ??
          // … sonst die, zu der das Werkzeug in erster Linie gehört.
          nutzbar.find((r) => r.werkzeuge[0] === letzte.name);
        return regel
          ? regel.weiter(letzte, text, jetzt, schritte.slice(0, -1))
          : sage("Erledigt.");
      }

      if (letzte?.rolle !== "nutzer") return sage(DEMO_ANTWORT);

      for (const regel of nutzbar) {
        const schritt = regel.erkenne(letzte.text, jetzt);
        if (schritt) return schritt;
      }
      return sage(DEMO_ANTWORT);
    },
  };
}
