import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// Alle Regeln, die axe für WCAG 2.0, 2.1 und 2.2 bis Stufe AA kennt.
const wcag22AA = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

const seiten = [
  { name: "Jarvis", pfad: "/" },
  { name: "Einstellungen", pfad: "/einstellungen" },
  { name: "Seite nicht gefunden", pfad: "/gibt-es-nicht" },
];

for (const farbschema of ["light", "dark"] as const) {
  test.describe(`Barrierefreiheit (${farbschema === "light" ? "hell" : "dunkel"})`, () => {
    test.use({ colorScheme: farbschema });

    test("Chat mit Freigabe-Karte ohne Verstöße gegen WCAG 2.2 AA", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByLabel("Nachricht an Jarvis")
        .fill("Trag Zahnarzt Freitag 10 Uhr ein");
      await page.getByRole("button", { name: "Senden" }).click();
      await expect(
        page.getByRole("button", { name: "Freigeben" }),
      ).toBeVisible();

      const ergebnis = await new AxeBuilder({ page })
        .withTags(wcag22AA)
        .analyze();

      expect(ergebnis.violations).toEqual([]);
    });

    test("Chat mit Aufgabenliste und Abhak-Karte ohne Verstöße gegen WCAG 2.2 AA", async ({
      page,
    }) => {
      await page.goto("/");
      await page
        .getByRole("button", { name: "„Was ist diese Woche fällig?“" })
        .click();
      await page.getByLabel("Nachricht an Jarvis").fill("Paket ist erledigt");
      await page.getByRole("button", { name: "Senden" }).click();
      await expect(
        page.getByRole("button", { name: "Freigeben" }),
      ).toBeVisible();

      const ergebnis = await new AxeBuilder({ page })
        .withTags(wcag22AA)
        .analyze();

      expect(ergebnis.violations).toEqual([]);
    });

    for (const seite of seiten) {
      test(`${seite.name} ohne Verstöße gegen WCAG 2.2 AA`, async ({
        page,
      }) => {
        await page.goto(seite.pfad);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

        const ergebnis = await new AxeBuilder({ page })
          .withTags(wcag22AA)
          .analyze();

        expect(ergebnis.violations).toEqual([]);
      });
    }
  });
}
