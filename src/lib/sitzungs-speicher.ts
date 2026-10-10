/**
 * Hält Daten je Sitzung nur im Arbeitsspeicher des Servers.
 *
 * Im Demo-Modus gibt es keine Datenbank (CLAUDE.md). Damit eine öffentlich
 * erreichbare App den Speicher nicht volllaufen lässt, ist er begrenzt:
 * höchstens `maxSitzungen` Sitzungen, die am längsten unbenutzte fliegt zuerst
 * raus, und nach `lebensdauerMs` ohne Zugriff verfällt eine Sitzung.
 */
export function sitzungsSpeicher<T>(
  anlegen: () => T,
  { maxSitzungen = 200, lebensdauerMs = 2 * 60 * 60 * 1000 } = {},
) {
  const eintraege = new Map<string, { wert: T; zuletzt: number }>();

  return {
    hole(sitzung: string, jetzt = Date.now()): T {
      for (const [id, eintrag] of eintraege) {
        if (jetzt - eintrag.zuletzt > lebensdauerMs) eintraege.delete(id);
      }
      const vorhanden = eintraege.get(sitzung);
      // Neu einfügen, damit die Reihenfolge der Map „zuletzt benutzt“ abbildet.
      eintraege.delete(sitzung);
      const wert = vorhanden?.wert ?? anlegen();
      eintraege.set(sitzung, { wert, zuletzt: jetzt });
      if (eintraege.size > maxSitzungen) {
        const aeltester = eintraege.keys().next().value;
        if (aeltester !== undefined) eintraege.delete(aeltester);
      }
      return wert;
    },
  };
}
