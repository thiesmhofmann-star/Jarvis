import { expect, test, type Page } from "@playwright/test";

function letzteAntwort(page: Page) {
  return page
    .getByRole("list", { name: "Unterhaltung mit Jarvis" })
    .locator("li")
    .last();
}

async function schreibe(page: Page, text: string) {
  await page.getByLabel("Nachricht an Jarvis").fill(text);
  await page.getByRole("button", { name: "Senden" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("Aufgabe aus Lenas Mail: Karte nennt die Mail als Quelle", async ({
  page,
}) => {
  await schreibe(page, "Mach aus der Mail von Lena eine Aufgabe");
  const karte = page.getByRole("region", { name: "Aufgabe anlegen" }).last();
  await expect(karte).toContainText("Unterlagen für Montag");
  await expect(karte).toContainText(
    "Mail von Lena Berger: „Unterlagen für Montag“",
  );
  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "(aus der Mail von Lena Berger)",
  );
});

test("Termin aus der Mail der Hausverwaltung, Bibliothek ohne Datum", async ({
  page,
}) => {
  await schreibe(page, "Trag den Termin aus der Mail der Hausverwaltung ein");
  const karte = page.getByRole("region", { name: "Termin anlegen" }).last();
  await expect(karte).toContainText("Wartung der Heizung");
  await expect(karte).toContainText("08:00 Uhr");
  await expect(karte).toContainText("240 Minuten");
  await expect(karte).toContainText("Mail von Hausverwaltung Sonnenhof");
  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "im Demo-Kalender (aus der Mail von Hausverwaltung Sonnenhof)",
  );

  await schreibe(page, "Mach aus der Mail von der Bibliothek eine Aufgabe");
  await expect(letzteAntwort(page)).toContainText(
    "In der Mail von Stadtbibliothek finde ich kein Datum.",
  );
});
