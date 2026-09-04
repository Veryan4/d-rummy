import { defineConfig, devices } from "@playwright/test";

const port = process.env.PLAYWRIGHT_PORT ?? "5173";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
