// Test-only bundle: no app route, authentication bypass, or backend writes.
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const bundle = await build({
  entryPoints: ["tests/visual/atlas-entry.tsx"],
  bundle: true,
  write: false,
  format: "iife",
  jsx: "automatic",
  plugins: [
    {
      name: "fixtures",
      setup(b) {
        b.onResolve(
          {
            filter:
              /^(convex\/react|@clerk\/nextjs|next\/link|next\/navigation)$/,
          },
          () => ({
            path: new URL("./atlas-stubs.tsx", import.meta.url).pathname,
          }),
        );
      },
    },
  ],
});
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto("http://localhost:3000");
const shell = await page.evaluate(() => ({
  links: [...document.querySelectorAll('link[rel="stylesheet"]')]
    .map((x) => x.outerHTML)
    .join(""),
  className: document.documentElement.className,
}));
await page.route("**/__atlas-bundle.js", (r) =>
  r.fulfill({
    contentType: "application/javascript",
    body: bundle.outputFiles[0].text,
  }),
);
await page.route("**/__atlas-qa?*", (r) =>
  r.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html lang="en" class="${shell.className}"><head>${shell.links}<meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script src="/__atlas-bundle.js"></script></body></html>`,
  }),
);
await mkdir("artifacts/atlas", { recursive: true });
for (const width of [360, 390, 768, 1280, 1440]) {
  await page.setViewportSize({ width, height: 1000 });
  for (const view of [
    "explore",
    "listings",
    "requests",
    "incoming",
    "detail",
    "notifications",
    "profile",
    "admin",
    "admin-listings",
  ]) {
    await page.goto(`http://localhost:3000/__atlas-qa?view=${view}`);
    await page.locator("h1").waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${view} overflows at ${width}`,
    );
    await page
      .locator("img")
      .evaluateAll((imgs) =>
        imgs.forEach((img) => img.setAttribute("loading", "eager")),
      );
    await page.waitForFunction(() =>
      [...document.images].every((img) => img.complete),
    );
    await page.screenshot({
      path: `artifacts/atlas/${view}-${width}.png`,
      fullPage: true,
    });
  }
}
await page.goto("http://localhost:3000/__atlas-qa?view=explore");
await page
  .getByRole("combobox", { name: "Price", exact: true })
  .selectOption("free");
assert.equal(await page.locator(".tool-card").count(), 1);
await page.getByRole("button", { name: "Reset filters" }).click();
await page.getByLabel("Search tools").fill("drill");
assert.equal(await page.locator(".tool-card").count(), 1);
await page.goto("http://localhost:3000/__atlas-qa?view=requests");
await page.getByRole("button", { name: "Completed returns" }).click();
assert.equal(await page.locator(".request-card").count(), 1);
await page.goto("http://localhost:3000/__atlas-qa?view=incoming");
assert.equal(
  await page
    .locator(".request-progress")
    .filter({ hasText: "Your decision" })
    .count(),
  0,
);
assert.equal(
  await page
    .locator(".request-progress")
    .filter({ hasText: "Waiting for borrower" })
    .count(),
  1,
);
await page.goto("http://localhost:3000/__atlas-qa?view=detail");
assert.equal(await page.locator("input[type=date]").count(), 0);
await page.getByText("Choose dates on a calendar").click();
if (
  (await page.locator(".calendar-heading strong").textContent()) ===
  "November 2026"
) {
  const blocked = page.getByRole("button", {
    name: /10 November 2026, reserved/,
  });
  assert(await blocked.isDisabled());
  assert.equal(await page.locator(".calendar-grid .is-reserved").count(), 3);
}

await page.screenshot({
  path: "artifacts/atlas/borrow-calendar.png",
  fullPage: true,
});
const day = page.locator(".calendar-grid button:not(:disabled)").first();
await day.click();
const selectedStart = await page
  .locator(".borrow-date-summary dd")
  .first()
  .textContent();
assert(selectedStart);
await day.click();
assert.equal(
  await page.locator(".borrow-date-summary dd").last().textContent(),
  selectedStart,
);
await page.getByRole("button", { name: "Next month" }).click();
await page.getByRole("button", { name: "Previous month" }).click();

assert(await page.getByRole("button", { name: "Send request" }).isEnabled());
await page.getByRole("button", { name: "Make an Offer" }).click();
assert(await page.getByLabel("Your daily offer in rupees").isVisible());
assert(await page.getByRole("button", { name: "Send Offer" }).isDisabled());
await page.getByLabel("Your daily offer in rupees").fill("100");
assert(await page.getByRole("button", { name: "Send Offer" }).isEnabled());
await page.getByRole("button", { name: "Request at Listed Price" }).click();
assert.equal(await page.getByLabel("Your daily offer in rupees").count(), 0);
await page.goto("http://localhost:3000/__atlas-qa?view=admin-listings");
assert.equal(await page.locator(".admin-listing").count(), 3);
for (const row of await page.locator(".admin-listing").all()) {
  assert((await row.locator(".admin-listing-info").boundingBox()).width > 100);
}
assert.deepEqual(errors, []);
console.log(
  "45 viewport/page renders + filter/search/completed checks passed. Fixture UI only.",
);
await browser.close();
