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

test("Feste Termine durchgehen: passt, entfernen mit Freigabe, Stopp", async ({
  page,
}) => {
  await page.goto("/");

  await schreibe(page, "Lass uns meine festen Termine durchgehen");
  await expect(letzteAntwort(page)).toContainText(
    "Wir gehen deine 3 festen Termine durch.",
  );
  await expect(letzteAntwort(page)).toContainText(
    "Fester Termin 1 von 3: „Training“",
  );

  await schreibe(page, "passt");
  await expect(letzteAntwort(page)).toContainText(
    "Fester Termin 2 von 3: „Yoga“",
  );

  await schreibe(page, "Gibt es nicht mehr");
  const karte = page.getByRole("region", { name: "Termin absagen" });
  await expect(karte).toContainText("Fällt weg:");
  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText("Entfernt: „Yoga“");
  await expect(letzteAntwort(page)).toContainText(
    "Fester Termin 3 von 3: „Gitarrenunterricht“",
  );

  await schreibe(page, "Stopp");
  await expect(letzteAntwort(page)).toContainText(
    "In Ordnung, wir hören hier auf. Durchgegangen: 2 von 3. Geändert: 0, entfernt: 1.",
  );
});
