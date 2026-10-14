import { expect, test } from "@playwright/test";

test("„Wie sieht mein Tag aus?“ zeigt Termine und fällige Aufgaben in einer Antwort", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "„Wie sieht mein Tag aus?“" }).click();

  const antwort = page
    .getByRole("list", { name: "Unterhaltung mit Jarvis" })
    .locator("li")
    .last();
  await expect(antwort).toContainText("Dein Überblick für heute,");
  await expect(antwort).toContainText("Termine (4):");
  await expect(antwort).toContainText("Team-Besprechung");
  await expect(antwort).toContainText("Training (jede Woche)");
  await expect(antwort).toContainText("Fällige Aufgaben bis heute (2):");
  await expect(antwort).toContainText(
    "Bibliotheksbuch zurückgeben – überfällig",
  );
  await expect(antwort).toContainText("Paket zur Post bringen – fällig heute");
  await expect(antwort).toContainText("Posteingang: 2 neue Mails von heute.");
  // Nur lesen: keine Freigabe-Karte
  await expect(page.getByRole("button", { name: "Freigeben" })).toHaveCount(0);
});

test("„Wie war mein Tag?“ zeigt den Abendrückblick", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Nachricht an Jarvis").fill("Wie war mein Tag?");
  await page.getByRole("button", { name: "Senden" }).click();

  const antwort = page
    .getByRole("list", { name: "Unterhaltung mit Jarvis" })
    .locator("li")
    .last();
  await expect(antwort).toContainText("Dein Abendrückblick für heute,");
  await expect(antwort).toContainText("Heute erledigt: nichts abgehakt.");
  await expect(antwort).toContainText("Heute im Kalender (4):");
  await expect(antwort).toContainText("Yoga (jede Woche)");
  await expect(antwort).toContainText("Offen bis morgen (2):");
});
