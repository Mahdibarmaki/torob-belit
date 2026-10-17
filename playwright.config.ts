import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

const installedChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ?? (existsSync(installedChrome) ? installedChrome : undefined);
// Keep production QA isolated from an already-open development preview on port 3000.
const testPort = 3100;
const testUrl = `http://127.0.0.1:${testPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: testUrl,
    launchOptions: { executablePath },
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npm run start -- --hostname 127.0.0.1 --port ${testPort}`,
    // Ordinary regression tests must never spend the developer's real API quota.
    // Real-provider verification is an explicit, separately recorded operation.
    env: { OPENAI_API_KEY: "", OPENAI_MODEL: "" },
    url: testUrl,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
