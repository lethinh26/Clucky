import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/ui",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  workers: 2,
  timeout: 30000,
  use: { browserName: "chromium", headless: true, trace: "retain-on-failure" },
  webServer: [
    {
      command:
        "npm --prefix ../react run dev -- --host 127.0.0.1 --port 4173 --strictPort",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: false,
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174",
      reuseExistingServer: false,
    },
    {
      command: "node tests/fixtures/server.mjs",
      url: "http://127.0.0.1:4175",
      reuseExistingServer: false,
    },
  ],
});
