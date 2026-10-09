import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FehlerAnzeige } from "./fehler-anzeige";

describe("FehlerAnzeige", () => {
  it("versucht es auf Knopfdruck erneut", () => {
    const erneutVersuchen = vi.fn();
    render(<FehlerAnzeige erneutVersuchen={erneutVersuchen} />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Etwas ist schiefgelaufen",
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erneut versuchen" }));

    expect(erneutVersuchen).toHaveBeenCalledOnce();
  });
});
