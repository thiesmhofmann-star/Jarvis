// @vitest-environment node
// Liest nur Dateien, braucht kein simuliertes Browserfenster.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { farben } from "./farben";

const tokens = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const [hellerTeil, dunklerTeil] = tokens.split(
  "@media (prefers-color-scheme: dark)",
);

function farbe(teil: string | undefined, name: string): string | undefined {
  const treffer = teil?.match(
    new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`),
  );
  return treffer?.[1]?.toLowerCase();
}

describe("farben.ts passt zu tokens.css", () => {
  it("helle Farben", () => {
    expect(farbe(hellerTeil, "hintergrund")).toBe(farben.hell.hintergrund);
    expect(farbe(hellerTeil, "akzent")).toBe(farben.hell.akzent);
    expect(farbe(hellerTeil, "auf-akzent")).toBe(farben.hell.aufAkzent);
  });

  it("dunkle Farben", () => {
    expect(farbe(dunklerTeil, "hintergrund")).toBe(farben.dunkel.hintergrund);
  });
});
