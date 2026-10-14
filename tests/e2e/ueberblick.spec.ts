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
  // Nur lesen: keine Freigabe-Karte
  await expect(page.getByRole("button", { name: "Freigeben" })).toHaveCount(0);
});
