import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import NichtGefunden from "./not-found";

describe("Seite nicht gefunden", () => {
  it("führt zurück zu Jarvis", () => {
    render(<NichtGefunden />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Seite nicht gefunden" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Zurück zu Jarvis" }),
    ).toHaveAttribute("href", "/");
  });
});
