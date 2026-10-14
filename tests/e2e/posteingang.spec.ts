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

test("„Was ist neu im Posteingang?“ und eine Mail lesen", async ({ page }) => {
  await page
    .getByRole("button", { name: "„Was ist neu im Posteingang?“" })
    .click();
  await expect(letzteAntwort(page)).toContainText(
    "Im Demo-Posteingang liegen 8 Mails",
  );
  await expect(letzteAntwort(page)).toContainText(
    "Hausverwaltung Sonnenhof: Wartung der Heizung am Donnerstag",
  );

  await schreibe(page, "Zeig die Mail von der Hausverwaltung");
  await expect(letzteAntwort(page)).toContainText("Heizungswartung");
  await expect(letzteAntwort(page)).toContainText(
    "service@hausverwaltung-sonnenhof.example",
  );
});

test("Antwort-Entwurf: Karte, Freigeben, nichts gesendet; Ablehnen speichert nichts", async ({
  page,
}) => {
  await schreibe(page, "Antworte Lena: Mach ich!");
  const abgelehnt = page
    .getByRole("region", { name: "Antwort-Entwurf speichern" })
    .last();
  await abgelehnt.getByRole("button", { name: "Ablehnen" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "In Ordnung, ich habe keinen Entwurf gespeichert.",
  );

  await schreibe(page, "Antworte der Hausverwaltung: Donnerstag passt, danke!");
  const karte = page
    .getByRole("region", { name: "Antwort-Entwurf speichern" })
    .last();
  await expect(karte).toContainText("Gesendet wird nichts.");
  await expect(karte).toContainText("Re: Wartung der Heizung am Donnerstag");
  await expect(karte).toContainText("Donnerstag passt, danke!");
  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "Gespeichert: Der Antwort-Entwurf an Hausverwaltung Sonnenhof liegt im Demo-Posteingang. Gesendet wird nichts.",
  );

  await schreibe(page, "Meine Entwürfe");
  await expect(letzteAntwort(page)).toContainText("liegt 1 Entwurf");
});

test("„Was ist heute wichtig in meinen Mails?“ und „Fass mir meine Mails zusammen“ mit Grund", async ({
  page,
}) => {
  await schreibe(page, "Was ist heute wichtig in meinen Mails?");
  await expect(letzteAntwort(page)).toContainText(
    "Heute brauchen dich 3 Mails:",
  );
  await expect(letzteAntwort(page)).toContainText(
    "Grund: Die Hausverwaltung fragt, ob der Termin passt",
  );

  await schreibe(page, "Fass mir meine Mails zusammen");
  await expect(letzteAntwort(page)).toContainText("Braucht dich heute (3):");
  await expect(letzteAntwort(page)).toContainText("Kann warten (3):");
  await expect(letzteAntwort(page)).toContainText("Egal (2):");
});
