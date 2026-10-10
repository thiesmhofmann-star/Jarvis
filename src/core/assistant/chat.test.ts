// @vitest-environment node
import { describe, expect, it } from "vitest";
import { aktionenImArbeitsspeicher } from "@/core/guard/aktionen";
import { erstelleSchutzschicht } from "@/core/guard/schutzschicht";
import { findeWerkzeug, werkzeuge } from "@/modules/registry";
import { erstelleChat } from "./chat";
import { erstelleDemoGehirn } from "./demo-gehirn";
import { gespraecheImArbeitsspeicher } from "./gespraeche";

// Integration: Demo-Gehirn, Schutzschicht und Demo-Kalender zusammen.
function neuerChat() {
  return erstelleChat({
    gehirn: erstelleDemoGehirn(),
    schutzschicht: erstelleSchutzschicht({
      findeWerkzeug,
      speicher: aktionenImArbeitsspeicher(),
    }),
    werkzeuge,
    gespraeche: gespraecheImArbeitsspeicher(),
  });
}

const jetzt = new Date("2026-10-10T08:00:00Z");
const ctx = () => ({ nutzerId: crypto.randomUUID(), jetzt });

function text(eintraege: { art: string; text?: string }[]) {
  return eintraege.map((e) => e.text ?? "").join("\n");
}

describe("Chat im Demo-Modus", () => {
  it("listet die Demo-Termine von heute", async () => {
    const eintraege = await neuerChat().sende("Was steht heute an?", ctx());

    expect(text(eintraege)).toContain(
      "Heute, Samstag, 10. Oktober, stehen 3 Termine",
    );
    expect(text(eintraege)).toContain("09:00–09:30 Uhr: Team-Besprechung");
  });

  it("trägt einen Termin erst nach Freigabe ein, danach taucht er auf", async () => {
    const chat = neuerChat();
    const c = ctx();

    const [karte] = await chat.sende("Trag Zahnarzt Freitag 10 Uhr ein", c);
    if (karte?.art !== "freigabe") throw new Error("Freigabe-Karte erwartet");
    expect(karte.aktion.vorschau.daten).toContainEqual({
      label: "Wann",
      wert: "Freitag, 16. Oktober, 10:00 Uhr",
    });
    expect(text(await chat.sende("Was steht Freitag an?", c))).toContain(
      "keine Termine",
    );

    const entscheidung = await chat.entscheide(karte.aktion.id, "freigeben", c);
    expect(entscheidung).toMatchObject({
      art: "ok",
      aktion: { status: "erledigt" },
    });
    if (entscheidung.art !== "ok") return;
    expect(text(entscheidung.eintraege)).toContain("Erledigt: „Zahnarzt“");

    expect(text(await chat.sende("Was steht Freitag an?", c))).toContain(
      "10:00–11:00 Uhr: Zahnarzt",
    );
  });

  it("ändert nach „Ablehnen“ nichts", async () => {
    const chat = neuerChat();
    const c = ctx();

    const [karte] = await chat.sende("Trag Friseur Montag 9 Uhr ein", c);
    if (karte?.art !== "freigabe") throw new Error("Freigabe-Karte erwartet");
    const entscheidung = await chat.entscheide(karte.aktion.id, "ablehnen", c);

    expect(entscheidung).toMatchObject({
      art: "ok",
      aktion: { status: "abgelehnt" },
    });
    expect(text(await chat.sende("Was steht Montag an?", c))).toContain(
      "keine Termine",
    );
  });

  it("trennt die Demo-Kalender verschiedener Sitzungen", async () => {
    const chat = neuerChat();
    const a = ctx();
    const [karte] = await chat.sende("Trag Zahnarzt heute 15 Uhr ein", a);
    if (karte?.art !== "freigabe") throw new Error("Freigabe-Karte erwartet");
    await chat.entscheide(karte.aktion.id, "freigeben", a);

    expect(text(await chat.sende("Was steht heute an?", ctx()))).not.toContain(
      "Zahnarzt",
    );
  });

  it("legt eine Aufgabe erst nach Freigabe an und zeigt sie in der Woche", async () => {
    const chat = neuerChat();
    const c = ctx();

    const [karte] = await chat.sende(
      "Neue Aufgabe: Steuererklärung abgeben bis Sonntag",
      c,
    );
    if (karte?.art !== "freigabe") throw new Error("Freigabe-Karte erwartet");
    expect(karte.aktion.vorschau.titel).toBe("Aufgabe anlegen");
    const entscheidung = await chat.entscheide(karte.aktion.id, "freigeben", c);
    if (entscheidung.art !== "ok") throw new Error("ok erwartet");
    expect(text(entscheidung.eintraege)).toContain(
      "Notiert: „Steuererklärung abgeben“",
    );

    const woche = text(await chat.sende("Was ist diese Woche fällig?", c));
    expect(woche).toContain(
      "Bis Sonntag, 11. Oktober, sind 3 Demo-Aufgaben fällig:",
    );
    expect(woche.indexOf("überfällig")).toBeLessThan(
      woche.indexOf("Steuererklärung"),
    );
  });

  it("hakt in zwei Schritten ab; „Ablehnen“ lässt die Aufgabe offen", async () => {
    const chat = neuerChat();
    const c = ctx();

    const [abgelehnt] = await chat.sende("Paket ist erledigt", c);
    if (abgelehnt?.art !== "freigabe")
      throw new Error("Freigabe-Karte erwartet");
    expect(abgelehnt.aktion.vorschau.daten[0]).toEqual({
      label: "Was",
      wert: "Paket zur Post bringen",
    });
    await chat.entscheide(abgelehnt.aktion.id, "ablehnen", c);
    expect(text(await chat.sende("Meine Aufgaben", c))).toContain(
      "Paket zur Post bringen",
    );

    const [karte] = await chat.sende("Paket ist erledigt", c);
    if (karte?.art !== "freigabe") throw new Error("Freigabe-Karte erwartet");
    const entscheidung = await chat.entscheide(karte.aktion.id, "freigeben", c);
    if (entscheidung.art !== "ok") throw new Error("ok erwartet");
    expect(text(entscheidung.eintraege)).toBe(
      "Abgehakt: „Paket zur Post bringen“ ist erledigt.",
    );
    expect(text(await chat.sende("Meine Aufgaben", c))).not.toContain("Paket");
  });

  it("zeigt bei einer unbekannten Aufgabe keine Freigabe-Karte", async () => {
    const eintraege = await neuerChat().sende(
      "Fliegen lernen ist erledigt",
      ctx(),
    );

    expect(eintraege).toEqual([
      {
        art: "jarvis",
        text: "Ich finde keine offene Demo-Aufgabe zu „Fliegen lernen“. Mit „Meine Aufgaben“ zeige ich dir alle offenen.",
      },
    ]);
  });
});
