import type { AusstehendeAktion } from "@/core/guard/aktionen";
import type { Schutzschicht } from "@/core/guard/schutzschicht";
import type { RegistriertesWerkzeug } from "@/modules/registry";
import type { WerkzeugKontext } from "@/modules/vertrag";
import type { ChatEintrag, FreigabeAnsicht } from "./eintraege";
import type { Gehirn, WerkzeugAngebot, WerkzeugAusgang } from "./gehirn";
import type { GespraechsSpeicher } from "./gespraeche";

/** Sicherung gegen ein Gehirn, das endlos Werkzeuge aufruft. */
const MAX_SCHRITTE = 5;

export type EntscheidungsAusgang =
  | { art: "ok"; aktion: FreigabeAnsicht; eintraege: ChatEintrag[] }
  | { art: "fehler"; grund: "unbekannt" | "entschieden"; meldung: string };

function ansicht(aktion: AusstehendeAktion): FreigabeAnsicht {
  return { id: aktion.id, vorschau: aktion.vorschau, status: aktion.status };
}

/**
 * Der Chat-Ablauf: Nachricht in den Verlauf, Gehirn fragen, Werkzeuge über
 * die Schutzschicht laufen lassen, bis das Gehirn mit Text antwortet.
 * Kennt keine Modul-Details, nur die Werkzeuge aus der Registry.
 */
export function erstelleChat({
  gehirn,
  schutzschicht,
  werkzeuge,
  gespraeche,
}: {
  gehirn: Gehirn;
  schutzschicht: Schutzschicht;
  werkzeuge: readonly RegistriertesWerkzeug[];
  gespraeche: GespraechsSpeicher;
}) {
  const angebote: WerkzeugAngebot[] = werkzeuge.map(({ name, werkzeug }) => ({
    name,
    beschreibung: werkzeug.description,
    effekt: werkzeug.effect,
    eingabe: werkzeug.input,
  }));

  async function denken(ctx: WerkzeugKontext): Promise<ChatEintrag[]> {
    for (let schritt = 0; schritt < MAX_SCHRITTE; schritt++) {
      const antwort = await gehirn.antworte({
        verlauf: await gespraeche.verlauf(ctx.nutzerId),
        werkzeuge: angebote,
        jetzt: ctx.jetzt,
      });

      if (antwort.art === "text") {
        await gespraeche.anhaengen(ctx.nutzerId, {
          rolle: "jarvis",
          text: antwort.text,
        });
        return [{ art: "jarvis", text: antwort.text }];
      }

      const aufruf = await schutzschicht.aufrufen(
        antwort.name,
        antwort.eingabe,
        ctx,
      );
      if (aufruf.art === "freigabe") {
        // Hier hält der Ablauf an, bis Thies freigibt oder ablehnt.
        return [{ art: "freigabe", aktion: ansicht(aufruf.aktion) }];
      }
      const ausgang: WerkzeugAusgang =
        aufruf.art === "ergebnis"
          ? { art: "ergebnis", ergebnis: aufruf.ergebnis }
          : { art: "fehler", meldung: aufruf.meldung };
      await gespraeche.anhaengen(ctx.nutzerId, {
        rolle: "werkzeug",
        name: antwort.name,
        eingabe: antwort.eingabe,
        ausgang,
      });
    }
    throw new Error("Das Gehirn hat zu viele Werkzeug-Schritte gebraucht.");
  }

  return {
    async sende(text: string, ctx: WerkzeugKontext): Promise<ChatEintrag[]> {
      await gespraeche.anhaengen(ctx.nutzerId, { rolle: "nutzer", text });
      return denken(ctx);
    },

    async entscheide(
      aktionId: string,
      entscheidung: "freigeben" | "ablehnen",
      ctx: WerkzeugKontext,
    ): Promise<EntscheidungsAusgang> {
      const ergebnis = await schutzschicht.entscheiden(
        aktionId,
        entscheidung,
        ctx,
      );
      if (ergebnis.art === "fehler") return ergebnis;

      const { aktion } = ergebnis;
      const ausgang: WerkzeugAusgang =
        ergebnis.art === "erledigt"
          ? { art: "ergebnis", ergebnis: aktion.ergebnis }
          : ergebnis.art === "abgelehnt"
            ? { art: "abgelehnt" }
            : {
                art: "fehler",
                meldung: aktion.fehler ?? "Unbekannter Fehler.",
              };
      await gespraeche.anhaengen(ctx.nutzerId, {
        rolle: "werkzeug",
        name: aktion.werkzeug,
        eingabe: aktion.eingabe,
        ausgang,
      });
      return {
        art: "ok",
        aktion: ansicht(aktion),
        eintraege: await denken(ctx),
      };
    },
  };
}

export type Chat = ReturnType<typeof erstelleChat>;
