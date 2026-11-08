import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

process.env.CLERK_PUBLISHABLE_KEY ||=
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const authTests = Boolean(
  process.env.E2E_CLERK_USER_EMAIL &&
  process.env.CLERK_SECRET_KEY &&
  process.env.NEXT_PUBLIC_CONVEX_URL &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_"),
);

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    ...(authTests
      ? [{ name: "clerk-setup", testMatch: /auth\.setup\.ts/ }]
      : []),
    {
      name: "chromium",
      testIgnore: /auth\.setup\.ts/,
      dependencies: authTests ? ["clerk-setup"] : [],
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
