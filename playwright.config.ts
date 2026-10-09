import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // Verhindert, dass ein versehentlich stehen gelassenes test.only in der CI durchrutscht.
  forbidOnly: !!process.env.CI,
  reporter: "list",
  use: {
    baseURL,
  },
  projects: [
    {
      // iPhone ist das Hauptgerät: Bildschirmgröße, Touch und Kennung eines iPhones.
      // Gerendert wird mit Chromium statt mit WebKit (dem Safari-Motor), weil in der
      // Claude-Code-Umgebung nur Chromium bereitsteht.
      name: "iphone",
      use: { ...devices["iPhone 17"], browserName: "chromium" },
    },
  ],
  webServer: {
    // Getestet wird der Produktions-Build, so nah wie möglich an Vercel.
    // Vorher `npm run build` ausführen (in der CI erledigt das `npm run check`).
    command: `npx next start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
