import { defineConfig } from "@playwright/test";

const chromiumPath =
  process.env.CHROMIUM_PATH ??
  (process.env.CI ? undefined : "/usr/bin/chromium");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false,
  outputDir: "playwright-test-output",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3101",
    browserName: "chromium",
    headless: true,
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : undefined,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
});
