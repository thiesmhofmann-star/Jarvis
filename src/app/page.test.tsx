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

  it("zeigt das Eingabefeld für den Chat", () => {
    render(<Startseite />);

    expect(screen.getByLabelText("Nachricht an Jarvis")).toBeInTheDocument();
  });
});
