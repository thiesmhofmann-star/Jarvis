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

async function freigeben(page: Page, karte: string) {
  const region = page.getByRole("region", { name: karte }).last();
  await region.getByRole("button", { name: "Freigeben" }).click();
  await expect(region).toContainText("Freigegeben und ausgeführt.");
  return region;
}

/** Datum in 10 Tagen in Berlin als „21.10.“ */
function inZehnTagen() {
  const teile = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "numeric",
    month: "numeric",
  }).formatToParts(new Date(Date.now() + 10 * 24 * 60 * 60 * 1000));
  const wert = (typ: string) => teile.find((t) => t.type === typ)!.value;
  return `${wert("day")}.${wert("month")}.`;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("„Training dauert ab jetzt 2 Stunden“: jede Woche länger", async ({
  page,
}) => {
  await schreibe(page, "Training dauert ab jetzt 2 Stunden");
  const karte = page.getByRole("region", { name: "Termin ändern" });
  await expect(karte).toContainText("20:00 bis 22:00 Uhr");
  await expect(karte).toContainText("jede Woche");
  await freigeben(page, "Termin ändern");
  await expect(letzteAntwort(page)).toContainText(
    "Erledigt: „Training“ dauert jetzt 2 Stunden",
  );

  await schreibe(page, "Was steht heute an?");
  await expect(letzteAntwort(page)).toContainText(
    "20:00–22:00 Uhr: Training (jede Woche)",
  );
});

test("„Benenne Laufen im Park um in Joggen“: neuer Titel im Kalender", async ({
  page,
}) => {
  await schreibe(page, "Benenne Laufen im Park um in Joggen");
  const karte = page.getByRole("region", { name: "Termin ändern" });
  await expect(karte).toContainText("„Laufen im Park“");
  await expect(karte).toContainText("„Joggen“");
  await freigeben(page, "Termin ändern");
  await expect(letzteAntwort(page)).toContainText(
    "Erledigt: „Laufen im Park“ heißt jetzt „Joggen“.",
  );

  await schreibe(page, "Was steht heute an?");
  await expect(letzteAntwort(page)).toContainText("18:00–19:00 Uhr: Joggen");
});

test("Datum: Termin am Tag in 10 Tagen eintragen und dort finden", async ({
  page,
}) => {
  const datum = inZehnTagen();
  await schreibe(page, `Trag Zahnarzt am ${datum} um 9 Uhr ein`);
  await freigeben(page, "Termin anlegen");

  await schreibe(page, `Was steht am ${datum} an?`);
  await expect(letzteAntwort(page)).toContainText("09:00–10:00 Uhr: Zahnarzt");
});
