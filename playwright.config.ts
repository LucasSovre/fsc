import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  timeout: 45000,
  use: { baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3038", viewport: { width: 390, height: 844 }, trace: "retain-on-failure" },
  webServer: {
    command: "bun run dev --port 3038",
    url: "http://localhost:3038/health",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
