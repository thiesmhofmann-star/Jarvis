import { expect, test } from "@playwright/test";

test("Manifest ist erreichbar und beschreibt die App", async ({ request }) => {
  const antwort = await request.get("/manifest.webmanifest");
  expect(antwort.ok()).toBe(true);

  const manifest = await antwort.json();
  expect(manifest).toMatchObject({
    name: "Jarvis",
    display: "standalone",
    start_url: "/",
  });

  // Jedes Icon aus dem Manifest muss sich laden lassen.
  for (const icon of manifest.icons as { src: string }[]) {
    const bild = await request.get(icon.src);
    expect(bild.ok(), icon.src).toBe(true);
    expect(bild.headers()["content-type"]).toBe("image/png");
  }
});

test("Seite verweist auf Manifest und Apple-Touch-Icon", async ({
  page,
  request,
}) => {
  await page.goto("/");

  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    /viewport-fit=cover/,
  );

  const appleIcon = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute("href");
  expect(appleIcon).toBeTruthy();
  const bild = await request.get(appleIcon!);
  expect(bild.ok()).toBe(true);
});
