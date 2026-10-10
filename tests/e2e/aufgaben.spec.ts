import { expect, test, type Page } from "@playwright/test";

function verlauf(page: Page) {
  return page.getByRole("list", { name: "Unterhaltung mit Jarvis" });
}

function letzteAntwort(page: Page) {
  return verlauf(page).locator("li").last();
}

async function schreibe(page: Page, text: string) {
  await page.getByLabel("Nachricht an Jarvis").fill(text);
  await page.getByRole("button", { name: "Senden" }).click();
}

async function legeAn(page: Page, text: string) {
  await schreibe(page, text);
  const karte = page.getByRole("region", { name: "Aufgabe anlegen" }).last();
  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(karte).toContainText("Freigegeben und ausgeführt.");
  return karte;
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("Neue Aufgabe mit Frist: Freigabe-Karte, Freigeben, Bestätigung", async ({
  page,
}) => {
  await schreibe(page, "Neue Aufgabe: Steuererklärung abgeben bis Freitag");

  const karte = page.getByRole("region", { name: "Aufgabe anlegen" });
  await expect(karte).toContainText("Steuererklärung abgeben");
  await expect(karte).toContainText("Frist:");
  await expect(karte).toContainText("Freitag");
  await expect(karte).toContainText("Demo-Aufgaben, nur im Arbeitsspeicher");

  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "Notiert: „Steuererklärung abgeben“ steht jetzt auf deiner Demo-Aufgabenliste, fällig am Freitag",
  );
});

test("Neue Aufgabe ohne Frist geht ohne Rückfrage", async ({ page }) => {
  const karte = await legeAn(page, "Neue Aufgabe: Fahrrad aufpumpen");

  await expect(karte).toContainText("keine");
  await expect(letzteAntwort(page)).toContainText("„Fahrrad aufpumpen“");
  await expect(letzteAntwort(page)).toContainText("ohne Frist");
});

test("„Was ist diese Woche fällig?“ nennt Überfälliges zuerst", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "„Was ist diese Woche fällig?“" })
    .click();

  const antwort = letzteAntwort(page);
  await expect(antwort).toContainText("Demo-Aufgaben fällig");
  await expect(antwort).toContainText(
    "Bibliotheksbuch zurückgeben – überfällig",
  );
  const text = await antwort.innerText();
  expect(text.indexOf("Bibliotheksbuch")).toBeLessThan(
    text.indexOf("Paket zur Post bringen"),
  );
  await expect(antwort).not.toContainText("Urlaubsfotos");

  await schreibe(page, "Meine Aufgaben");
  await expect(letzteAntwort(page)).toContainText(
    "Urlaubsfotos sortieren – ohne Frist",
  );
});

test("Aufgabe abhaken: Freigabe-Karte, Freigeben, danach nicht mehr in der Liste", async ({
  page,
}) => {
  await legeAn(page, "Neue Aufgabe: Steuererklärung abgeben bis Freitag");

  await schreibe(page, "Steuererklärung ist erledigt");
  const karte = page.getByRole("region", { name: "Aufgabe abhaken" });
  await expect(karte).toContainText("Steuererklärung abgeben");
  await expect(karte).toContainText("Freitag");
  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "Abgehakt: „Steuererklärung abgeben“ ist erledigt.",
  );

  await schreibe(page, "Was muss ich erledigen?");
  await expect(letzteAntwort(page)).toContainText("offene Demo-Aufgaben");
  await expect(letzteAntwort(page)).not.toContainText("Steuererklärung");
});

test("Aufgabe abhaken und „Ablehnen“: sie bleibt offen", async ({ page }) => {
  await schreibe(page, "Bibliotheksbuch ist erledigt");

  const karte = page.getByRole("region", { name: "Aufgabe abhaken" });
  await karte.getByRole("button", { name: "Ablehnen" }).click();
  await expect(karte).toContainText("Abgelehnt – es wurde nichts geändert.");
  await expect(letzteAntwort(page)).toContainText(
    "In Ordnung, die Aufgabe bleibt offen.",
  );

  await schreibe(page, "Meine Aufgaben");
  await expect(letzteAntwort(page)).toContainText(
    "Bibliotheksbuch zurückgeben",
  );
});

test("Unbekannte Aufgabe: freundliche Antwort, keine Freigabe-Karte", async ({
  page,
}) => {
  await schreibe(page, "Fliegen lernen ist erledigt");

  await expect(letzteAntwort(page)).toContainText(
    "Ich finde keine offene Demo-Aufgabe zu „Fliegen lernen“.",
  );
  await expect(
    page.getByRole("region", { name: "Aufgabe abhaken" }),
  ).toHaveCount(0);
});

test("Einstellungen zeigen beide Module", async ({ page }) => {
  await page.goto("/einstellungen");

  await expect(
    page.getByRole("heading", { level: 2, name: "Aktive Module" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Kalender (Demo)" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 3, name: "Aufgaben & Fristen (Demo)" }),
  ).toBeVisible();
  await expect(
    page.getByText("Gedächtnis und Konto kommen mit dem Anschluss-Block dazu."),
  ).toBeVisible();
});
