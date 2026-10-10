// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  berlinDatum,
  berlinZeitpunkt,
  formatiereTag,
  formatiereUhrzeit,
  naechsterWochentag,
} from "./zeit";

// Samstag, 10. Oktober 2026, 10:00 Uhr in Berlin (Sommerzeit, UTC+2)
const jetzt = new Date("2026-10-10T08:00:00Z");

describe("Zeit in Berlin", () => {
  it("rechnet Berliner Uhrzeiten in Sommer- und Winterzeit um", () => {
    expect(berlinZeitpunkt("2026-10-16", 10, 0).toISOString()).toBe(
      "2026-10-16T08:00:00.000Z",
    );
    expect(berlinZeitpunkt("2026-11-06", 10, 0).toISOString()).toBe(
      "2026-11-06T09:00:00.000Z",
    );
  });

  it("findet den nächsten Wochentag, heute zählt mit", () => {
    expect(naechsterWochentag(jetzt, 5)).toBe("2026-10-16"); // Freitag
    expect(naechsterWochentag(jetzt, 6)).toBe("2026-10-10"); // Samstag = heute
  });

  it("nimmt kurz vor Mitternacht UTC schon den Berliner Folgetag", () => {
    expect(berlinDatum(new Date("2026-10-10T22:30:00Z"))).toBe("2026-10-11");
  });

  it("formatiert Tag und Uhrzeit auf Deutsch", () => {
    expect(formatiereTag("2026-10-16")).toBe("Freitag, 16. Oktober");
    expect(formatiereUhrzeit(new Date("2026-10-16T08:00:00Z"))).toBe("10:00");
  });
});
