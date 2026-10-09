import { expect, test } from "@playwright/test";

test("Wechsel zwischen den Bereichen per Tab-Leiste", async ({ page }) => {
  await page.goto("/");
  const leiste = page.getByRole("navigation", { name: "Hauptnavigation" });
  const jarvis = leiste.getByRole("link", { name: "Jarvis" });
  const einstellungen = leiste.getByRole("link", { name: "Einstellungen" });

  await expect(jarvis).toHaveAttribute("aria-current", "page");

  await einstellungen.click();
  await expect(page).toHaveURL("/einstellungen");
  await expect(
    page.getByRole("heading", { level: 1, name: "Einstellungen" }),
  ).toBeVisible();
  await expect(einstellungen).toHaveAttribute("aria-current", "page");
  await expect(jarvis).not.toHaveAttribute("aria-current");

  await jarvis.click();
  await expect(page).toHaveURL("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Jarvis" }),
  ).toBeVisible();
  await expect(jarvis).toHaveAttribute("aria-current", "page");
});

test("Tippflächen der Tab-Leiste sind mindestens 44 × 44 px groß", async ({
  page,
}) => {
  await page.goto("/");
  const tabs = page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("link");

  for (const tab of await tabs.all()) {
    const box = await tab.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
});

test("Sprunglink führt zum Inhalt", async ({ page }) => {
  await page.goto("/");
  const sprunglink = page.getByRole("link", { name: "Zum Inhalt" });

  // Erster Link der Seite, damit ihn die Tastatur als Erstes erreicht.
  await expect(page.getByRole("link").first()).toHaveAccessibleName(
    "Zum Inhalt",
  );

  // Fokus direkt setzen statt Tab: Safari springt mit Tab nicht auf Links.
  await sprunglink.focus();
  const box = await sprunglink.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);

  await sprunglink.press("Enter");
  await expect(page.locator("main#inhalt")).toBeFocused();
});

test("Unbekannte Adresse zeigt „Seite nicht gefunden“", async ({ page }) => {
  const antwort = await page.goto("/gibt-es-nicht");

  expect(antwort?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { level: 1, name: "Seite nicht gefunden" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Zurück zu Jarvis" }).click();
  await expect(page).toHaveURL("/");
});
