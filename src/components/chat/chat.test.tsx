import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FreigabeAnsicht } from "@/core/assistant/eintraege";
import { MELDUNG_ALLGEMEIN, MELDUNG_VERBINDUNG } from "./api";
import { Chat } from "./chat";

function antwortet(...antworten: { status?: number; body: unknown }[]) {
  const fetchAttrappe = vi.fn();
  for (const { status = 200, body } of antworten) {
    fetchAttrappe.mockResolvedValueOnce(
      new Response(JSON.stringify(body), { status }),
    );
  }
  vi.stubGlobal("fetch", fetchAttrappe);
  return fetchAttrappe;
}

function schreibe(text: string) {
  fireEvent.change(screen.getByLabelText("Nachricht an Jarvis"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Senden" }));
}

const karte: FreigabeAnsicht = {
  id: "aktion-1",
  status: "offen",
  vorschau: {
    titel: "Termin anlegen",
    beschreibung: "Jarvis trägt diesen Termin ein.",
    daten: [{ label: "Was", wert: "Zahnarzt" }],
  },
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Chat", () => {
  it("zeigt den Demo-Hinweis und Beispielsätze", () => {
    render(<Chat />);

    expect(screen.getByRole("note")).toHaveTextContent(
      "Demo-Modus – Jarvis antwortet mit vorbereiteten Texten. Nichts wird gespeichert.",
    );
    expect(
      screen.getByRole("button", { name: "„Was steht heute an?“" }),
    ).toBeInTheDocument();
  });

  it("zeigt eigene Nachricht und Antwort getrennt und liest die Antwort vor", async () => {
    antwortet({
      body: { eintraege: [{ art: "jarvis", text: "Hallo Thies" }] },
    });
    render(<Chat />);

    schreibe("Hallo");

    const verlauf = await screen.findByRole("list", {
      name: "Unterhaltung mit Jarvis",
    });
    const [du, jarvis] = await within(verlauf).findAllByRole("listitem");
    expect(du).toHaveTextContent("Du:Hallo");
    expect(jarvis).toHaveTextContent("Jarvis:Hallo Thies");
    expect(document.querySelector("[aria-live=polite]")).toHaveTextContent(
      "Jarvis: Hallo Thies",
    );
  });

  it("meldet einen Verbindungsfehler verständlich auf Deutsch", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    render(<Chat />);

    schreibe("Hallo");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      MELDUNG_VERBINDUNG,
    );
  });

  it("zeigt bei unerwarteten Fehlern keinen technischen Text", async () => {
    // Zum Beispiel ein Browser ohne crypto.randomUUID (nur über https verfügbar)
    vi.stubGlobal("crypto", {});
    render(<Chat />);

    schreibe("Hallo");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      MELDUNG_ALLGEMEIN,
    );
  });

  it("zeigt die Meldung des Servers bei einem Fehler", async () => {
    antwortet({ status: 400, body: { fehler: "Die Nachricht ist zu lang." } });
    render(<Chat />);

    schreibe("Hallo");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Die Nachricht ist zu lang.",
    );
  });

  it("schickt die Freigabe erst auf Knopfdruck und zeigt danach den Status", async () => {
    const fetchAttrappe = antwortet(
      { body: { eintraege: [{ art: "freigabe", aktion: karte }] } },
      {
        body: {
          aktion: { ...karte, status: "erledigt" },
          eintraege: [{ art: "jarvis", text: "Erledigt." }],
        },
      },
    );
    render(<Chat />);

    schreibe("Trag Zahnarzt Freitag 10 Uhr ein");
    const freigeben = await screen.findByRole("button", { name: "Freigeben" });
    expect(fetchAttrappe).toHaveBeenCalledTimes(1);

    fireEvent.click(freigeben);

    expect(
      await screen.findByText("Freigegeben und ausgeführt."),
    ).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Freigeben" })).toBeNull();
    const zweiteAnfrage = JSON.parse(fetchAttrappe.mock.calls[1]![1].body);
    expect(zweiteAnfrage).toMatchObject({
      art: "entscheidung",
      aktionId: "aktion-1",
      entscheidung: "freigeben",
    });
  });
});
