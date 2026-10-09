import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

// iPhone ist das Hauptgerät: Bildschirmgröße, Touch und Kennung eines iPhones.
const iphone = devices["iPhone 17"];

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
      // Läuft überall, auch in Claude Code, wo nur Chromium bereitsteht.
      name: "iphone-chromium",
      use: { ...iphone, browserName: "chromium" },
    },
    // Nur in der CI: WebKit ist die Technik von Safari und damit am nächsten
    // am echten iPhone. Die CI installiert WebKit dafür mit.
    ...(process.env.CI
      ? [
          {
            name: "iphone-webkit",
            use: { ...iphone, browserName: "webkit" as const },
          },
        ]
      : []),
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
