import type { Gehirn } from "../gehirn";
import { demoRegeln, type DemoRegel } from "./regeln";

export const DEMO_ANTWORT =
  "Das kann ich im Demo-Modus noch nicht. Gerade antworte ich mit vorbereiteten Texten und kenne nur den Demo-Kalender. Probier zum Beispiel „Was steht heute an?“ oder „Trag Zahnarzt Freitag 10 Uhr ein“.";

/**
 * Das Demo-Gehirn: erkennt anhand fester Regeln, welches Werkzeug passt.
 * Es nutzt nur Werkzeuge, die ihm angeboten werden, genau wie später Claude.
 */
export function erstelleDemoGehirn(
  regeln: readonly DemoRegel[] = demoRegeln,
): Gehirn {
  return {
    async antworte({ verlauf, werkzeuge, jetzt }) {
      const letzte = verlauf.at(-1);

      // Ein Werkzeug ist gelaufen (oder wurde abgelehnt): Ergebnis in Worte fassen.
      if (letzte?.rolle === "werkzeug") {
        const regel = regeln.find((r) => r.werkzeug === letzte.name);
        return {
          art: "text",
          text: regel ? regel.formuliere(letzte.ausgang, jetzt) : "Erledigt.",
        };
      }

      if (letzte?.rolle !== "nutzer")
        return { art: "text", text: DEMO_ANTWORT };

      const angeboten = new Set(werkzeuge.map((w) => w.name));
      for (const regel of regeln) {
        if (!angeboten.has(regel.werkzeug)) continue;
        const treffer = regel.erkenne(letzte.text, jetzt);
        if (!treffer) continue;
        if ("rueckfrage" in treffer)
          return { art: "text", text: treffer.rueckfrage };
        return {
          art: "werkzeug",
          name: regel.werkzeug,
          eingabe: treffer.eingabe,
        };
      }
      return { art: "text", text: DEMO_ANTWORT };
    },
  };
}
