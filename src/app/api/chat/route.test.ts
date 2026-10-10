// @vitest-environment node
import { describe, expect, it } from "vitest";
import { POST } from "./route";

function anfrage(body: unknown) {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const sitzung = crypto.randomUUID();

describe("POST /api/chat", () => {
  it("prüft die Eingabe und lehnt leere Nachrichten ab", async () => {
    const antwort = await POST(
      anfrage({ art: "nachricht", sitzung, text: "   " }),
    );

    expect(antwort.status).toBe(400);
    expect(await antwort.json()).toEqual({
      fehler: "Die Nachricht ist leer, zu lang oder unvollständig.",
    });
  });

  it("lehnt eine ungültige Sitzung und zu lange Nachrichten ab", async () => {
    expect(
      (await POST(anfrage({ art: "nachricht", sitzung: "x", text: "Hallo" })))
        .status,
    ).toBe(400);
    expect(
      (
        await POST(
          anfrage({ art: "nachricht", sitzung, text: "a".repeat(2001) }),
        )
      ).status,
    ).toBe(400);
  });

  it("beantwortet eine gültige Nachricht", async () => {
    const antwort = await POST(
      anfrage({ art: "nachricht", sitzung, text: "Hallo" }),
    );

    expect(antwort.status).toBe(200);
    expect(await antwort.json()).toMatchObject({
      eintraege: [{ art: "jarvis" }],
    });
  });

  it("meldet eine unbekannte Freigabe mit 404", async () => {
    const antwort = await POST(
      anfrage({
        art: "entscheidung",
        sitzung,
        aktionId: crypto.randomUUID(),
        entscheidung: "freigeben",
      }),
    );

    expect(antwort.status).toBe(404);
  });
});
