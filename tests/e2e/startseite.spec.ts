import { expect, test } from "@playwright/test";

test("Startseite lädt, Überschrift sichtbar, Seitensprache Deutsch", async ({
  page,
}) => {
  const antwort = await page.goto("/");

  expect(antwort?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { level: 1, name: "Jarvis" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
});
