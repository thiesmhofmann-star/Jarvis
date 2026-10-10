import { expect, test, type Page } from "@playwright/test";

function verlauf(page: Page) {
  return page.getByRole("list", { name: "Unterhaltung mit Jarvis" });
}

async function schreibe(page: Page, text: string) {
  await page.getByLabel("Nachricht an Jarvis").fill(text);
  await page.getByRole("button", { name: "Senden" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("Demo-Hinweis ist sichtbar", async ({ page }) => {
  await expect(
    page.getByText(
      "Demo-Modus – Jarvis antwortet mit vorbereiteten Texten. Nichts wird gespeichert.",
    ),
  ).toBeVisible();
});

test("„Was steht heute an?“ listet die Demo-Termine", async ({ page }) => {
  // Beispielsatz antippen statt tippen
  await page.getByRole("button", { name: "„Was steht heute an?“" }).click();

  await expect(verlauf(page).getByText("Was steht heute an?")).toBeVisible();
  await expect(verlauf(page)).toContainText("Team-Besprechung");
  await expect(verlauf(page)).toContainText("Laufen im Park");
});

test("Termin eintragen: Freigabe-Karte, Freigeben, danach steht er im Kalender", async ({
  page,
}) => {
  await schreibe(page, "Trag Zahnarzt Freitag 10 Uhr ein");

  const karte = page.getByRole("region", { name: "Termin anlegen" });
  await expect(karte).toContainText("Freigabe nötig");
  await expect(karte).toContainText("Zahnarzt");
  await expect(karte).toContainText("Freitag");
  await expect(karte).toContainText("10:00 Uhr");

  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(karte).toContainText("Freigegeben und ausgeführt.");
  await expect(karte.getByRole("button")).toHaveCount(0);
  await expect(verlauf(page)).toContainText("Erledigt: „Zahnarzt“");

  await schreibe(page, "Was steht Freitag an?");
  await expect(verlauf(page).locator("li").last()).toContainText(
    "10:00–11:00 Uhr: Zahnarzt",
  );
});

test("Termin eintragen und „Ablehnen“: nichts ändert sich", async ({
  page,
}) => {
  await schreibe(page, "Trag Friseur Montag 9 Uhr ein");

  const karte = page.getByRole("region", { name: "Termin anlegen" });
  await karte.getByRole("button", { name: "Ablehnen" }).click();
  await expect(karte).toContainText("Abgelehnt – es wurde nichts geändert.");
  await expect(verlauf(page)).toContainText(
    "In Ordnung, ich habe nichts eingetragen.",
  );

  await schreibe(page, "Was steht Montag an?");
  const antwort = verlauf(page).locator("li").last();
  await expect(antwort).toContainText("Montag");
  await expect(antwort).not.toContainText("Friseur");
});

test("Etwas Unbekanntes bekommt eine freundliche Demo-Antwort", async ({
  page,
}) => {
  await page.getByLabel("Nachricht an Jarvis").fill("Wie wird das Wetter?");
  await page.getByLabel("Nachricht an Jarvis").press("Enter");

  await expect(verlauf(page)).toContainText(
    "Das kann ich im Demo-Modus noch nicht.",
  );
});

test("Eingabe klebt auch bei langem Verlauf direkt über der Tab-Leiste", async ({
  page,
}) => {
  for (const tag of ["heute", "Montag", "Dienstag", "Freitag"]) {
    await schreibe(page, `Was steht ${tag} an?`);
    await expect(verlauf(page).locator("li").last()).toContainText(
      "Demo-Kalender",
    );
  }
  await page.evaluate(() => window.scrollTo(0, 0));

  const eingabe = await page.getByLabel("Nachricht an Jarvis").boundingBox();
  const leiste = await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .boundingBox();
  expect(eingabe && leiste).toBeTruthy();
  // Unterkante der Eingabe liegt über der Oberkante der Tab-Leiste.
  expect(eingabe!.y + eingabe!.height).toBeLessThanOrEqual(leiste!.y);
  expect(eingabe!.y).toBeGreaterThan(0);
});
