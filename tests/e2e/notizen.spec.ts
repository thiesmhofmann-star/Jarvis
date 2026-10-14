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

test("Notiz anlegen, anzeigen und löschen, jeweils mit Freigabe", async ({
  page,
}) => {
  await page.goto("/");

  await schreibe(page, "Notiz: Fahrradschloss kaufen");
  const anlegen = page.getByRole("region", { name: "Notiz anlegen" });
  await expect(anlegen).toContainText("Fahrradschloss kaufen");
  await anlegen.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "Notiert: „Fahrradschloss kaufen“",
  );

  await schreibe(page, "Meine Notizen");
  await expect(letzteAntwort(page)).toContainText("Du hast 3 Demo-Notizen");
  await expect(letzteAntwort(page)).toContainText("• Fahrradschloss kaufen");

  await schreibe(page, "Lösch die Notiz Fahrradschloss");
  const loeschen = page.getByRole("region", { name: "Notiz löschen" });
  await loeschen.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "Gelöscht: Die Notiz „Fahrradschloss kaufen“ ist weg.",
  );
});
