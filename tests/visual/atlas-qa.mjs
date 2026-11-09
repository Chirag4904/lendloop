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
    if (view === "detail" && width === 390) {
      await page.getByText("Choose dates on a calendar").click();
      const box = await page.locator(".calendar-content").boundingBox();
      assert(
        box &&
          box.x >= 0 &&
          box.x + box.width <= width &&
          box.y >= 0 &&
          box.y + box.height <= 1000,
      );
      await page.screenshot({
        path: "artifacts/atlas/borrow-calendar-mobile.png",
      });
    }
  }
}
await page.goto("http://localhost:3000/__atlas-qa?view=explore");
assert(
  await page
    .getByRole("heading", { name: "Your neighborhood shelf." })
    .isVisible(),
);
assert.equal(await page.locator(".explore-page .tool-card").count(), 6);
await page.getByRole("button", { name: "Within 500 m" }).click();
assert.equal(await page.evaluate(() => window.__atlasExploreArgs.scope), "500");
assert.equal(
  await page
    .getByRole("button", { name: "Within 500 m" })
    .getAttribute("aria-pressed"),
  "true",
);
await page.getByRole("button", { name: "Garden", exact: true }).click();
assert.equal(await page.locator(".explore-page .tool-card").count(), 1);
await page.getByRole("combobox", { name: "Sort by" }).selectOption("price");
assert.equal(
  await page.evaluate(() => window.__atlasExploreArgs.sort),
  "price",
);
await page.getByRole("button", { name: "Reset filters" }).click();
assert.equal(
  await page
    .getByRole("button", { name: "My Society" })
    .getAttribute("aria-pressed"),
  "true",
);
assert.equal(
  await page.getByRole("combobox", { name: "Sort by" }).inputValue(),
  "nearest",
);
await page
  .getByRole("combobox", { name: "Price", exact: true })
  .selectOption("free");
assert.equal(await page.locator(".tool-card").count(), 1);
await page.getByRole("button", { name: "Reset filters" }).click();
await page.getByLabel("Search tools").fill("drill");
assert.equal(await page.locator(".tool-card").count(), 1);
await page.getByLabel("Search tools").fill("no matching item");
assert(
  await page
    .getByRole("heading", { name: "Nothing here just yet." })
    .isVisible(),
);
await page.getByRole("button", { name: "Clear filters" }).click();
assert.equal(await page.locator(".explore-page .tool-card").count(), 6);
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
assert.equal(await page.locator(".thumb-row").count(), 0);
await page.goto("http://localhost:3000/__atlas-qa?view=detail-multi");
assert.equal(await page.getByRole("button", { name: /Show photo/ }).count(), 2);
await page.getByRole("button", { name: "Show photo 2" }).click();
assert.equal(
  await page
    .getByRole("button", { name: "Show photo 2" })
    .getAttribute("aria-pressed"),
  "true",
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
  .locator(".borrow-calendar summary")
  .textContent();
assert(selectedStart);
await day.click();
assert.notEqual(
  await page.locator(".borrow-calendar summary").textContent(),
  selectedStart,
);
assert.equal(
  await page.locator(".borrow-calendar").evaluate((el) => el.open),
  false,
);
await page.locator(".borrow-calendar summary").click();
await page.getByRole("button", { name: "Next month" }).click();
await page.getByRole("button", { name: "Previous month" }).click();
await page.keyboard.press("Escape");
assert.equal(
  await page.locator(".borrow-calendar").evaluate((el) => el.open),
  false,
);
await page.locator(".borrow-calendar summary").click();
await page.getByRole("button", { name: "Done", exact: true }).click();
assert.equal(
  await page.locator(".borrow-calendar").evaluate((el) => el.open),
  false,
);

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
