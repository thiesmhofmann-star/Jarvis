import { aufgabenDemo } from "./aufgaben-demo";
import { kalenderDemo } from "./kalender-demo";
import type { JarvisModule, ModuleTool } from "./vertrag";

/** Alle aktiven Module. Neues Modul = neuer Ordner + ein Eintrag hier. */
export const registrierteModule: readonly JarvisModule[] = [
  kalenderDemo,
  aufgabenDemo,
];

export type RegistriertesWerkzeug = {
  name: string;
  modulId: string;
  werkzeug: ModuleTool;
};

/** Sammelt die Werkzeuge aller Module. Namen müssen eindeutig sein, weil das Gehirn sie nur über den Namen aufruft. */
export function sammleWerkzeuge(
  module: readonly JarvisModule[],
): RegistriertesWerkzeug[] {
  const gesammelt: RegistriertesWerkzeug[] = [];
  for (const modul of module) {
    for (const [name, werkzeug] of Object.entries(modul.tools)) {
      const doppelt = gesammelt.find((w) => w.name === name);
      if (doppelt) {
        throw new Error(
          `Werkzeug „${name}“ gibt es doppelt (${doppelt.modulId} und ${modul.id}).`,
        );
      }
      gesammelt.push({ name, modulId: modul.id, werkzeug });
    }
  }
  return gesammelt;
}

export const werkzeuge = sammleWerkzeuge(registrierteModule);

export function findeWerkzeug(name: string): RegistriertesWerkzeug | undefined {
  return werkzeuge.find((w) => w.name === name);
}
