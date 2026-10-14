import { expect, test, type Page } from "@playwright/test";

// Die Tests laufen am echten Tag. Der Demo-Kalender legt „Training“ jede
// Sitzung neu auf den heutigen Wochentag um 20 Uhr; darauf bauen die Abläufe.

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

/** Wochentag von heute in Berlin, z. B. „Samstag“ */
function heutigerWochentag() {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
  }).format(new Date());
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("„Verschieb Laufen im Park auf 19 Uhr“: Karte mit Bisher und Neu, danach die neue Zeit", async ({
  page,
}) => {
  await schreibe(page, "Verschieb Laufen im Park auf 19 Uhr");

  const karte = page.getByRole("region", { name: "Termin ändern" });
  await expect(karte).toContainText("Freigabe nötig");
  // Vorher und nachher stehen als Begriff und Wert, nicht nur als Pfeil.
  await expect(karte.getByRole("term")).toContainText(["Bisher:", "Neu:"]);
  await expect(karte.getByRole("definition").nth(1)).toContainText(
    "18:00 bis 19:00 Uhr",
  );
  await expect(karte.getByRole("definition").nth(2)).toContainText(
    "19:00 bis 20:00 Uhr",
  );

  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(karte).toContainText("Freigegeben und ausgeführt.");
  await expect(letzteAntwort(page)).toContainText(
    "Erledigt: „Laufen im Park“ steht jetzt am",
  );

  await schreibe(page, "Was steht heute an?");
  await expect(letzteAntwort(page)).toContainText(
    "19:00–20:00 Uhr: Laufen im Park",
  );
});

test("„Training ist ab jetzt immer um 19 Uhr“: ab heute jede Woche um 19 Uhr", async ({
  page,
}) => {
  // Beispielsatz antippen
  await page
    .getByRole("button", { name: "„Training ist ab jetzt immer um 19 Uhr“" })
    .click();

  const karte = page.getByRole("region", { name: "Termin ändern" });
  await expect(karte).toContainText("Gilt für:");
  await expect(karte).toContainText(`Ab ${heutigerWochentag()}, `);
  await expect(karte).toContainText("jede Woche");
  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText("jede Woche um 19:00 Uhr");

  await schreibe(page, "Was steht heute an?");
  await expect(letzteAntwort(page)).toContainText(
    "19:00–20:30 Uhr: Training (jede Woche)",
  );
  await schreibe(page, "Wann ist Training?");
  await expect(letzteAntwort(page)).toContainText("5 Termine zu „Training“");
  await expect(letzteAntwort(page)).not.toContainText("20:00–21:30");
});

test("„Training fällt nächste Woche aus“: nur dieses Vorkommen fehlt", async ({
  page,
}) => {
  await schreibe(page, "Training fällt nächste Woche aus");

  const karte = page.getByRole("region", { name: "Termin absagen" });
  await expect(karte).toContainText("Fällt weg:");
  await expect(karte).toContainText("Nur am");
  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "In den anderen Wochen bleibt der Termin im Demo-Kalender.",
  );

  // Heute plus vier Wochen sind 5 Vorkommen, eins davon ist abgesagt.
  await schreibe(page, "Wann ist Training?");
  await expect(letzteAntwort(page)).toContainText("4 Termine zu „Training“");
  await schreibe(page, "Was steht heute an?");
  await expect(letzteAntwort(page)).toContainText("Training");
});

test("„Sag Training am <heute> ab“: heute fällt weg, die Woche darauf ist wieder da", async ({
  page,
}) => {
  const wochentag = heutigerWochentag();
  await schreibe(page, `Sag Training am ${wochentag} ab`);

  const karte = page.getByRole("region", { name: "Termin absagen" });
  await expect(karte).toContainText(`Nur am ${wochentag}`);
  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "Erledigt: „Training“ fällt am",
  );

  await schreibe(page, "Was steht heute an?");
  await expect(letzteAntwort(page)).not.toContainText("Training");
  await schreibe(page, "Wann ist Training?");
  await expect(letzteAntwort(page)).toContainText("4 Termine zu „Training“");
});

test("„Ablehnen“ beim Ändern und Absagen ändert nichts", async ({ page }) => {
  await schreibe(page, "Verschieb Laufen im Park auf 19 Uhr");
  const aendern = page.getByRole("region", { name: "Termin ändern" });
  await aendern.getByRole("button", { name: "Ablehnen" }).click();
  await expect(aendern).toContainText("Abgelehnt – es wurde nichts geändert.");
  await expect(letzteAntwort(page)).toContainText(
    "In Ordnung, der Termin bleibt, wie er war.",
  );

  await schreibe(page, "Training fällt nächste Woche aus");
  const absagen = page.getByRole("region", { name: "Termin absagen" });
  await absagen.getByRole("button", { name: "Ablehnen" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "In Ordnung, der Termin bleibt im Demo-Kalender.",
  );

  await schreibe(page, "Was steht heute an?");
  await expect(letzteAntwort(page)).toContainText(
    "18:00–19:00 Uhr: Laufen im Park",
  );
  await schreibe(page, "Wann ist Training?");
  await expect(letzteAntwort(page)).toContainText("5 Termine zu „Training“");
});

test("„Trag jeden Mittwoch 20 Uhr Chorprobe ein“: erscheint an den nächsten Mittwochen", async ({
  page,
}) => {
  await schreibe(page, "Trag jeden Mittwoch 20 Uhr Chorprobe ein");

  const karte = page.getByRole("region", { name: "Dauertermin anlegen" });
  await expect(karte).toContainText("Jede Woche am Mittwoch");
  await karte.getByRole("button", { name: "Freigeben" }).click();
  await expect(letzteAntwort(page)).toContainText(
    "Erledigt: „Chorprobe“ steht jetzt jede Woche am Mittwoch um 20:00 Uhr",
  );

  await schreibe(page, "Wann ist Chorprobe?");
  const antwort = letzteAntwort(page);
  // In 31 Tagen liegen 4 oder 5 Mittwoche.
  await expect(antwort).toContainText(/[45] Termine zu „Chorprobe“/);
  await expect(antwort).toContainText(
    /• Mittwoch, .+, 20:00–21:00 Uhr: Chorprobe/,
  );
  const zeilen = (await antwort.innerText()).match(/• Mittwoch/g) ?? [];
  expect(zeilen.length).toBeGreaterThanOrEqual(4);
});

test("„Verschieb Fliegen lernen auf 10 Uhr“: freundliche Antwort, keine Karte", async ({
  page,
}) => {
  await schreibe(page, "Verschieb Fliegen lernen auf 10 Uhr");

  await expect(letzteAntwort(page)).toContainText(
    "keinen Termin zu „Fliegen lernen“",
  );
  await expect(page.getByRole("region", { name: "Termin ändern" })).toHaveCount(
    0,
  );
});
