// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { registrierteModule, sammleWerkzeuge, werkzeuge } from "./registry";
import type { JarvisModule } from "./vertrag";

const lesen = {
  description: "liest",
  effect: "read" as const,
  input: z.object({}),
  execute: async () => "ok",
};

function modul(id: string, namen: string[]): JarvisModule {
  return {
    id,
    name: id,
    description: id,
    tools: Object.fromEntries(namen.map((n) => [n, lesen])),
  };
}

describe("Registry", () => {
  it("liefert die Werkzeuge aller Module mit ihrem Modul", () => {
    const gesammelt = sammleWerkzeuge([
      modul("a", ["eins", "zwei"]),
      modul("b", ["drei"]),
    ]);

    expect(gesammelt.map((w) => [w.modulId, w.name])).toEqual([
      ["a", "eins"],
      ["a", "zwei"],
      ["b", "drei"],
    ]);
  });

  it("lehnt doppelte Werkzeug-Namen ab", () => {
    expect(() =>
      sammleWerkzeuge([modul("a", ["gleich"]), modul("b", ["gleich"])]),
    ).toThrow(/doppelt/);
  });

  it("liefert die Werkzeuge beider Demo-Module, Namen eindeutig", () => {
    expect(registrierteModule.map((m) => m.id)).toEqual([
      "kalender-demo",
      "aufgaben-demo",
    ]);
    expect(
      werkzeuge.map((w) => [w.modulId, w.name, w.werkzeug.effect]),
    ).toEqual([
      ["kalender-demo", "termine_am_tag", "read"],
      ["kalender-demo", "termin_anlegen", "write"],
      ["aufgaben-demo", "aufgaben_anzeigen", "read"],
      ["aufgaben-demo", "aufgabe_anlegen", "write"],
      ["aufgaben-demo", "aufgabe_erledigen", "write"],
    ]);
    const namen = werkzeuge.map((w) => w.name);
    expect(new Set(namen).size).toBe(namen.length);
  });
});
