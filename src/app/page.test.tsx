import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Startseite from "./page";

describe("Startseite", () => {
  it("zeigt die Überschrift Jarvis", () => {
    render(<Startseite />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Jarvis" }),
    ).toBeInTheDocument();
  });

  it("zeigt den Leer-Zustand für den Chat", () => {
    render(<Startseite />);

    expect(
      screen.getByText("Hier kommt bald der Chat mit Jarvis hin."),
    ).toBeInTheDocument();
  });
});
