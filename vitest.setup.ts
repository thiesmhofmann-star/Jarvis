import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Ohne globale Vitest-Funktionen räumt Testing Library nicht selbst auf.
// Sonst bleibt die Ausgabe eines Tests im DOM und stört den nächsten.
afterEach(() => {
  cleanup();
});
