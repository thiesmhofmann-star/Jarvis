import type { RegistriertesWerkzeug } from "@/modules/registry";
import type { WerkzeugKontext } from "@/modules/vertrag";
import type { AktionsSpeicher, AusstehendeAktion } from "./aktionen";

/** Ergebnis eines Werkzeug-Aufrufs, wie es der Kern weiterverarbeitet. */
export type AufrufErgebnis =
  | { art: "ergebnis"; ergebnis: unknown }
  | { art: "freigabe"; aktion: AusstehendeAktion }
  | { art: "fehler"; meldung: string };

export type EntscheidungsErgebnis =
  | { art: "erledigt"; aktion: AusstehendeAktion }
  | { art: "abgelehnt"; aktion: AusstehendeAktion }
  | { art: "fehlgeschlagen"; aktion: AusstehendeAktion }
  | { art: "fehler"; meldung: string; grund: "unbekannt" | "entschieden" };

/**
 * Die Schutzschicht ist der einzige Weg, ein Werkzeug auszuführen.
 * Lese-Werkzeuge laufen sofort. Schreib-Werkzeuge werden nur als ausstehende
 * Aktion abgelegt und laufen erst, wenn Thies sie freigibt.
 */
export function erstelleSchutzschicht({
  findeWerkzeug,
  speicher,
}: {
  findeWerkzeug: (name: string) => RegistriertesWerkzeug | undefined;
  speicher: AktionsSpeicher;
}) {
  return {
    async aufrufen(
      name: string,
      eingabe: unknown,
      ctx: WerkzeugKontext,
    ): Promise<AufrufErgebnis> {
      const eintrag = findeWerkzeug(name);
      if (!eintrag)
        return { art: "fehler", meldung: `Werkzeug „${name}“ gibt es nicht.` };

      const geprueft = eintrag.werkzeug.input.safeParse(eingabe);
      if (!geprueft.success) {
        return {
          art: "fehler",
          meldung: "Die Angaben für dieses Werkzeug sind ungültig.",
        };
      }

      const werkzeug = eintrag.werkzeug;
      if (werkzeug.effect === "read") {
        return {
          art: "ergebnis",
          ergebnis: await werkzeug.execute(geprueft.data, ctx),
        };
      }

      // Schreiben: nur Vorschau erzeugen und ablegen, nichts ausführen.
      const aktion: AusstehendeAktion = {
        id: crypto.randomUUID(),
        nutzerId: ctx.nutzerId,
        modulId: eintrag.modulId,
        werkzeug: name,
        eingabe: geprueft.data,
        vorschau: await werkzeug.preview(geprueft.data, ctx),
        status: "offen",
        erstelltAm: ctx.jetzt,
      };
      await speicher.anlegen(aktion);
      return { art: "freigabe", aktion };
    },

    async entscheiden(
      aktionId: string,
      entscheidung: "freigeben" | "ablehnen",
      ctx: WerkzeugKontext,
    ): Promise<EntscheidungsErgebnis> {
      const aktion = await speicher.holen(ctx.nutzerId, aktionId);
      if (!aktion) {
        return {
          art: "fehler",
          grund: "unbekannt",
          meldung: "Diese Freigabe gibt es nicht mehr.",
        };
      }
      if (aktion.status !== "offen") {
        return {
          art: "fehler",
          grund: "entschieden",
          meldung: "Darüber wurde schon entschieden.",
        };
      }

      aktion.entschiedenAm = ctx.jetzt;
      if (entscheidung === "ablehnen") {
        aktion.status = "abgelehnt";
        await speicher.speichern(aktion);
        return { art: "abgelehnt", aktion };
      }

      // Erst als freigegeben merken, dann ausführen: Ein zweites „Freigeben“
      // findet die Aktion nicht mehr offen und führt nichts doppelt aus.
      aktion.status = "freigegeben";
      await speicher.speichern(aktion);

      const eintrag = findeWerkzeug(aktion.werkzeug);
      const geprueft = eintrag?.werkzeug.input.safeParse(aktion.eingabe);
      try {
        if (
          !eintrag ||
          eintrag.werkzeug.effect !== "write" ||
          !geprueft?.success
        ) {
          throw new Error("Das Werkzeug für diese Aktion gibt es nicht mehr.");
        }
        aktion.ergebnis = await eintrag.werkzeug.execute(geprueft.data, ctx);
        aktion.status = "erledigt";
        await speicher.speichern(aktion);
        return { art: "erledigt", aktion };
      } catch (fehler) {
        aktion.status = "fehlgeschlagen";
        aktion.fehler =
          fehler instanceof Error ? fehler.message : String(fehler);
        await speicher.speichern(aktion);
        return { art: "fehlgeschlagen", aktion };
      }
    },
  };
}

export type Schutzschicht = ReturnType<typeof erstelleSchutzschicht>;
