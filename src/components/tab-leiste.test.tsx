import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { istAktiv } from "./bereiche";
import { TabLeiste } from "./tab-leiste";

const pfad = vi.hoisted(() => ({ aktuell: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pfad.aktuell }));

function tab(name: string) {
  return screen.getByRole("link", { name });
}

describe("TabLeiste", () => {
  beforeEach(() => {
    pfad.aktuell = "/";
  });

  it("markiert auf der Startseite den Bereich Jarvis", () => {
    render(<TabLeiste />);

    expect(tab("Jarvis")).toHaveAttribute("aria-current", "page");
    expect(tab("Einstellungen")).not.toHaveAttribute("aria-current");
  });

  it("markiert unter /einstellungen den Bereich Einstellungen", () => {
    pfad.aktuell = "/einstellungen";
    render(<TabLeiste />);

    expect(tab("Einstellungen")).toHaveAttribute("aria-current", "page");
    expect(tab("Jarvis")).not.toHaveAttribute("aria-current");
  });

  it("markiert auf einer unbekannten Adresse keinen Bereich", () => {
    pfad.aktuell = "/gibt-es-nicht";
    render(<TabLeiste />);

    expect(screen.queryByRole("link", { current: "page" })).toBeNull();
  });

  it("liegt in einer benannten Navigation", () => {
    render(<TabLeiste />);

    expect(
      screen.getByRole("navigation", { name: "Hauptnavigation" }),
    ).toBeInTheDocument();
  });
});

describe("istAktiv", () => {
  it("behandelt Unterseiten als Teil des Bereichs", () => {
    expect(istAktiv("/einstellungen", "/einstellungen/module")).toBe(true);
    expect(istAktiv("/einstellungen", "/einstellungen-alt")).toBe(false);
  });

  it("aktiviert Jarvis nur auf der Startseite selbst", () => {
    expect(istAktiv("/", "/")).toBe(true);
    expect(istAktiv("/", "/einstellungen")).toBe(false);
  });
});
