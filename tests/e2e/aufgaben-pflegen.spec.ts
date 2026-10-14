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
}

/** Datum in 5 Tagen in Berlin als „21.10.“ */
function inFuenfTagen() {
  const teile = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "numeric",
    month: "numeric",
  }).formatToParts(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000));
  const wert = (typ: string) => teile.find((t) => t.type === typ)!.value;
  return `${wert("day")}.${wert("month")}.`;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("Frist verschieben: Karte „Aufgabe ändern“, danach nicht mehr heute fällig", async ({
  page,
}) => {
  await schreibe(page, `Paket zur Post hat Zeit bis ${inFuenfTagen()}`);
  const karte = page.getByRole("region", { name: "Aufgabe ändern" });
  await expect(karte).toContainText("Bisher:");
  await expect(karte).toContainText("Neu:");
  await freigeben(page, "Aufgabe ändern");
  await expect(letzteAntwort(page)).toContainText(
    "Geändert: „Paket zur Post bringen“ ist jetzt fällig am",
  );

  await schreibe(page, "Was ist bis heute fällig?");
  await expect(letzteAntwort(page)).not.toContainText("Paket");
});

test("Aufgabe löschen nach Freigabe", async ({ page }) => {
  await schreibe(page, "Lösch die Aufgabe Urlaubsfotos");
  await expect(
    page.getByRole("region", { name: "Aufgabe löschen" }),
  ).toContainText("Urlaubsfotos sortieren");
  await freigeben(page, "Aufgabe löschen");

  await schreibe(page, "Meine Aufgaben");
  await expect(letzteAntwort(page)).not.toContainText("Urlaubsfotos");
});

test("Abhaken, „Was habe ich erledigt?“ und wieder öffnen", async ({
  page,
}) => {
  await schreibe(page, "Paket ist erledigt");
  await freigeben(page, "Aufgabe abhaken");

  await schreibe(page, "Was habe ich erledigt?");
  await expect(letzteAntwort(page)).toContainText(
    "Erledigt hast du 1 Demo-Aufgabe:",
  );
  await expect(letzteAntwort(page)).toContainText("Paket zur Post bringen");

  await schreibe(page, "Paket ist doch nicht erledigt");
  await freigeben(page, "Aufgabe wieder öffnen");
  await expect(letzteAntwort(page)).toContainText(
    "Wieder offen: „Paket zur Post bringen“",
  );
});
