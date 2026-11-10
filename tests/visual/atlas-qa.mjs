// Test-only bundle: no app route, authentication bypass, or backend writes.
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const bundle = await build({
  entryPoints: ["tests/visual/atlas-entry.tsx"],
  bundle: true,
  write: false,
  outdir: "atlas-fixture",
  format: "iife",
  jsx: "automatic",
  // PublicCatalog renders its connected path only when these are present.
  define: {
    "process.env.NEXT_PUBLIC_CONVEX_URL": '"https://fixture.invalid"',
    "process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY": '"pk_test_fixture"',
  },
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
const fixtureScript = bundle.outputFiles.find((file) =>
  file.path.endsWith(".js"),
);
const fixtureStyles = bundle.outputFiles.find((file) =>
  file.path.endsWith(".css"),
);
assert(fixtureScript && fixtureStyles);
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
    body: fixtureScript.text,
  }),
);
await page.route("**/__atlas-bundle.css", (r) =>
  r.fulfill({ contentType: "text/css", body: fixtureStyles.text }),
);
await page.route("**/__atlas-qa?*", (r) =>
  r.fulfill({
    contentType: "text/html",
    body: `<!doctype html><html lang="en" class="${shell.className}"><head>${shell.links}<link rel="stylesheet" href="/__atlas-bundle.css"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script src="/__atlas-bundle.js"></script></body></html>`,
  }),
);
await mkdir("artifacts/atlas", { recursive: true });
for (const width of [390, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("http://localhost:3000/__atlas-qa?view=loading");
  await page
    .getByRole("status")
    .getByRole("heading", { name: "Preparing your neighborhood." })
    .waitFor();
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: `artifacts/atlas/loading-${width}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator('[class*="orbit"]')
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
}
for (const width of [390, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("http://localhost:3000/__atlas-qa?view=route-loading");
  const loader = page
    .getByRole("status")
    .filter({ hasText: "Loading your page…" });
  await loader.waitFor();
  assert.equal(await loader.locator('[aria-hidden="true"]').count(), 1);
  await page.screenshot({
    path: `artifacts/atlas/shared-loader-${width}.png`,
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await loader
      .locator('[class*="orbit"]')
      .evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
}
await page.goto("http://localhost:3000/__atlas-qa?view=loan-shared");
assert(await page.getByLabel(/Contact phone/).isChecked());
assert(
  await page
    .getByRole("button", { name: "Update shared details" })
    .isDisabled(),
);
for (const width of [360, 390, 768, 1280, 1440]) {
  await page.setViewportSize({ width, height: 1000 });
  for (const view of [
    "explore",
    "listings",
    "requests",
    "incoming",
    "detail",
    "detail-owner",
    "notifications",
    "profile",
    "onboarding",
    "loan",
    "loan-borrower",
    "admin",
    "admin-listings",
    "listing-new",
    "listing-edit",
  ]) {
    await page.goto(`http://localhost:3000/__atlas-qa?view=${view}`);
    await page.locator("h1").waitFor();
    if (view === "detail-owner") {
      assert.equal(
        await page
          .getByRole("link", { name: "Edit listing" })
          .getAttribute("href"),
        "/dashboard/listings/tool0/edit",
      );
      assert.equal(
        await page
          .getByRole("heading", { name: "How borrowing works" })
          .count(),
        0,
      );
      assert.equal(
        await page.getByRole("region", { name: "Borrow this item" }).count(),
        0,
      );
    }
    if (view === "loan" || view === "loan-borrower") {
      assert(
        await page
          .getByRole("heading", { name: "Notification delivery" })
          .isVisible(),
      );
      assert(await page.getByText("Delivery failed").isVisible());
      const share = page.getByRole("button", {
        name: "Share selected details",
      });
      assert(await share.isDisabled());
      await page.getByLabel(/Contact phone/).check();
      assert(await share.isEnabled());
      await share.click();
      assert(
        await page
          .getByRole("status")
          .filter({ hasText: "Shared with" })
          .isVisible(),
      );
      assert(await page.getByLabel(/Contact phone/).isChecked());
      assert.deepEqual(await page.evaluate(() => window.__atlasHandoverArgs), {
        loanId: "loan0",
        phone: "+91 98765 43210",
        pickupPoint: "",
        instructions: "",
        returnInstructions: "",
      });
      assert(
        await page
          .getByRole("button", { name: "Update shared details" })
          .isDisabled(),
      );
    }
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
    if (view === "profile" || view === "loan" || view === "loan-borrower") {
      await page
        .getByRole("button", {
          name: view === "profile" ? "Edit saved details" : "Edit my details",
        })
        .click();
      const fields = page.getByRole("textbox");
      assert.equal(await fields.count(), 4);
      for (const field of await fields.all()) {
        const style = await field.evaluate((el) => {
          const s = getComputedStyle(el);
          return {
            width: parseFloat(s.borderTopWidth),
            color: s.borderTopColor,
            height: el.getBoundingClientRect().height,
          };
        });
        assert(
          style.width >= 1 &&
            style.color !== "rgba(0, 0, 0, 0)" &&
            style.height >= 44,
          `${view}: editable field must have a visible border and usable height`,
        );
      }
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${view} edit form overflows at ${width}`,
      );
      await page.screenshot({
        path: `artifacts/atlas/${view}-editing-${width}.png`,
        fullPage: true,
      });
      if (view === "loan-borrower" && width === 390) {
        await page
          .getByRole("textbox", { name: "Pickup point (optional)" })
          .fill("Library entrance");
        await page.getByRole("button", { name: "Save details" }).click();
        await page
          .getByRole("status")
          .filter({ hasText: "updated for this loan" })
          .waitFor();
        assert.deepEqual(
          await page.evaluate(() => window.__atlasHandoverArgs),
          {
            loanId: "loan0",
            phone: "",
            pickupPoint: "Library entrance",
            instructions: "",
            returnInstructions: "",
          },
        );
      }
      if (view === "profile" && width === 390) {
        const phone = page.getByRole("textbox", { name: "Contact phone" });
        const savedPhone = await phone.inputValue();
        assert.equal(await phone.getAttribute("type"), "tel");
        assert.equal(await phone.getAttribute("maxlength"), "20");
        await phone.fill("+91 12345 67890");
        await page.getByRole("button", { name: "Save details" }).click();
        await page
          .getByRole("alert")
          .filter({ hasText: "Mutations disabled in visual QA" })
          .waitFor();
        assert.equal(await phone.inputValue(), "+91 12345 67890");
        await page.getByRole("button", { name: "Cancel" }).click();
        await page.getByRole("button", { name: "Edit saved details" }).click();
        assert.equal(await phone.inputValue(), savedPhone);
      }
    }
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
assert.equal(await page.getByRole("article").count(), 6);
await page
  .getByRole("combobox", { name: "Search distance" })
  .selectOption("500");
assert.equal(await page.evaluate(() => window.__atlasExploreArgs.scope), "500");
assert.equal(
  await page.getByRole("combobox", { name: "Search distance" }).inputValue(),
  "500",
);
await page.getByRole("button", { name: "Garden", exact: true }).press("Space");
assert.equal(await page.getByRole("article").count(), 1);
assert.equal(
  await page.evaluate(() => window.__atlasExploreArgs.category),
  "Garden",
);
await page.getByRole("combobox", { name: "Sort by" }).selectOption("price");
assert.equal(
  await page.evaluate(() => window.__atlasExploreArgs.sort),
  "price",
);
await page.getByRole("button", { name: "Reset filters" }).click();
assert.deepEqual(await page.evaluate(() => window.__atlasExploreArgs), {
  scope: "society",
  text: "",
  category: undefined,
  price: "all",
  sort: "nearest",
});
assert.equal(
  await page.getByRole("combobox", { name: "Search distance" }).inputValue(),
  "society",
);
assert.equal(
  await page.getByRole("combobox", { name: "Sort by" }).inputValue(),
  "nearest",
);
await page
  .getByRole("group", { name: "Price" })
  .getByRole("button", { name: "Free" })
  .click();
assert.equal(await page.getByRole("article").count(), 1);
assert.equal(
  await page.evaluate(() => window.__atlasExploreArgs.price),
  "free",
);
await page.getByRole("button", { name: "Reset filters" }).click();
const toolSearch = page.getByLabel("Search tools");
await toolSearch.fill("drill");
assert.equal(await page.getByRole("article").count(), 1);
await toolSearch.press("Enter");
assert.equal(
  await page.evaluate(() => window.__atlasExploreArgs.text),
  "drill",
);
assert(await toolSearch.evaluate((input) => document.activeElement !== input));
await page.getByLabel("Search tools").fill("no matching item");
assert(
  await page
    .getByRole("heading", { name: "Nothing here just yet." })
    .isVisible(),
);
await page.getByRole("button", { name: "Clear filters" }).click();
assert.equal(await page.getByRole("article").count(), 6);
await page.goto("http://localhost:3000/__atlas-qa?view=listings");
const listingCard = page.getByRole("article").filter({
  has: page.getByRole("heading", { name: "Cordless drill" }),
});
assert.equal(
  await listingCard.getByRole("link", { name: "Edit" }).getAttribute("href"),
  "/dashboard/listings/tool0/edit",
);
await listingCard.getByRole("button", { name: "Unlist" }).click();
await listingCard.getByText("Unlisted", { exact: true }).waitFor();
await listingCard.getByRole("button", { name: "Relist" }).click();
await listingCard.getByText("Active", { exact: true }).waitFor();
page.once("dialog", (dialog) => void dialog.dismiss());
const archiveListing = listingCard.getByRole("button", { name: "Archive" });
await archiveListing.click();
assert(await listingCard.getByText("Active", { exact: true }).isVisible());
page.once("dialog", (dialog) => void dialog.accept());
await archiveListing.click();
await listingCard.getByText("Archived", { exact: true }).waitFor();
assert.equal(await listingCard.getByRole("button").count(), 0);
assert.equal(await listingCard.getByRole("link", { name: "Edit" }).count(), 0);
await page.goto("http://localhost:3000/__atlas-qa?view=loan-borrower");
const backToRequests = page.getByRole("link", { name: /Back to requests/ });
assert.equal(await backToRequests.getAttribute("href"), "/dashboard/requests");
await page.getByRole("button", { name: "I’ve Returned the Item" }).click();
await page.getByText("Waiting for the lender to confirm the return.").waitFor();
assert(
  await page.getByText("Borrower reported return", { exact: true }).isVisible(),
);
await page.goto("http://localhost:3000/__atlas-qa?view=loan&pendingReturn");
assert.equal(await backToRequests.getAttribute("href"), "/dashboard/incoming");
assert(await page.getByText("Sent", { exact: true }).isVisible());
assert(await page.getByText("Retry pending", { exact: true }).isVisible());
await page.getByRole("button", { name: "Confirm Return" }).click();
await page.getByText("Return confirmed. This loan is complete.").waitFor();
assert(
  await page.getByText("Lender confirmed return", { exact: true }).isVisible(),
);
assert.equal(
  await page.getByRole("button", { name: "Confirm Return" }).count(),
  0,
);
await page.goto(
  "http://localhost:3000/__atlas-qa?view=notifications&updates=sent",
);
const notifications = page.getByRole("list", { name: "Notifications" });
await notifications.getByText("Delivered", { exact: true }).waitFor();
assert.equal(
  await notifications
    .getByRole("link", { name: "View request" })
    .first()
    .getAttribute("href"),
  "/dashboard/incoming#request-request0",
);
assert.equal(
  await notifications
    .getByRole("link", { name: "View loan" })
    .getAttribute("href"),
  "/dashboard/loans/loan1",
);
assert(await notifications.getByText("Sent", { exact: true }).isVisible());
assert(
  await notifications.getByText("Retry pending", { exact: true }).isVisible(),
);
assert.equal(
  await notifications.locator("time").first().getAttribute("datetime"),
  new Date(1794200000000).toISOString(),
);
await page.goto(
  "http://localhost:3000/__atlas-qa?view=notifications&updates=loading",
);
await page
  .getByRole("status")
  .filter({ hasText: "Loading notifications…" })
  .waitFor();
await page.goto(
  "http://localhost:3000/__atlas-qa?view=notifications&updates=empty",
);
await page.getByRole("heading", { name: "No notifications yet" }).waitFor();
assert.equal(
  await page
    .getByRole("link", { name: "View your activity →" })
    .getAttribute("href"),
  "/dashboard/requests",
);
await page.evaluate(() => {
  window.Notification = class {
    static permission = "default";
    static async requestPermission() {
      this.permission = "granted";
      return this.permission;
    }
  };
  window.dispatchEvent(new Event("focus"));
});
await page
  .getByRole("button", { name: "Enable browser notifications" })
  .click();
await page
  .getByRole("button", { name: "Enable browser notifications" })
  .waitFor({ state: "hidden" });
assert.equal(
  await page.getByText("Browser notifications are enabled.").count(),
  0,
);
await page.goto("http://localhost:3000/__atlas-qa?view=explore");
await page.getByRole("link", { name: "Updates", exact: true }).waitFor();
await page.evaluate(() => {
  window.Notification = class {
    static permission = "granted";
    constructor(title, options) {
      window.__atlasBrowserUpdate = { title, body: options.body };
    }
  };
  history.replaceState(null, "", "?view=explore&updates=unread");
  window.dispatchEvent(new PopStateEvent("popstate"));
});
await page.waitForFunction(() => Boolean(window.__atlasBrowserUpdate));
assert.deepEqual(await page.evaluate(() => window.__atlasBrowserUpdate), {
  title: "LendLoop",
  body: "You have a new update.",
});
const updatesViewport = page.viewportSize();
for (const width of [390, 1440]) {
  await page.setViewportSize({ width, height: 1000 });
  await page.getByRole("link", { name: "Updates, 1 unread" }).waitFor();
  await page.screenshot({ path: `artifacts/atlas/updates-badge-${width}.png` });
}
if (updatesViewport) await page.setViewportSize(updatesViewport);
await page.goto(
  "http://localhost:3000/__atlas-qa?view=notifications&updates=unread",
);
await page.waitForFunction(() => Boolean(window.__atlasReadArgs));
assert.deepEqual(await page.evaluate(() => window.__atlasReadArgs), {
  ids: ["notification1"],
});
await page.goto("http://localhost:3000/__atlas-qa?view=requests");
const activityNav = page.getByRole("navigation", { name: "Activity views" });
assert.equal(
  await activityNav
    .getByRole("link", { name: "Things I’m borrowing" })
    .getAttribute("aria-current"),
  "page",
);
assert.equal(await page.getByRole("article").count(), 2);
await page.getByRole("button", { name: "History" }).click();
assert.equal(await page.getByRole("article").count(), 1);
assert.equal(
  await page
    .getByRole("button", { name: "History" })
    .getAttribute("aria-pressed"),
  "true",
);
await page.goto("http://localhost:3000/__atlas-qa?view=incoming");
const recordedProgress = page.getByRole("list", { name: "Recorded progress" });
assert.equal(
  await recordedProgress.filter({ hasText: "Your decision" }).count(),
  0,
);
assert.equal(
  await recordedProgress.filter({ hasText: "Waiting for borrower" }).count(),
  1,
);
await page.goto("http://localhost:3000/__atlas-qa?view=incoming&pendingOffer");
const suggestPrice = page.getByRole("button", {
  name: "Suggest Another Price",
});
await suggestPrice.click();
const counteroffer = page.getByRole("dialog", {
  name: "Suggest Another Price",
});
const counterInput = counteroffer.getByRole("textbox", {
  name: "Your final daily price in rupees",
});
const sendPrice = counteroffer.getByRole("button", {
  name: "Send final price",
});
await counterInput.fill("100");
assert(await sendPrice.isDisabled());
await counterInput.fill("125");
assert(await sendPrice.isEnabled());
await page.keyboard.press("Escape");
await counteroffer.waitFor({ state: "hidden" });
assert(
  await suggestPrice.evaluate((button) => button === document.activeElement),
);
await page.goto("http://localhost:3000/__atlas-qa?view=detail");
const gallery = page.getByRole("group", { name: "Listing photos" });
assert.equal(await gallery.count(), 0);
await page.goto("http://localhost:3000/__atlas-qa?view=detail-multi");
assert.equal(await gallery.getByRole("button").count(), 2);
await gallery.getByRole("button", { name: "Show photo 2" }).press("Space");
assert.equal(
  await gallery
    .getByRole("button", { name: "Show photo 2" })
    .getAttribute("aria-pressed"),
  "true",
);
assert(await page.getByRole("img", { name: /, photo 2$/ }).isVisible());
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
await page.goto(
  "http://localhost:3000/__atlas-qa?view=admin-listings&adminDenied",
);
await page.getByRole("alert").getByText("Admin access required.").waitFor();
assert.equal(await page.getByRole("article").count(), 0);

await page.goto("http://localhost:3000/__atlas-qa?view=admin-listings");
await page.getByRole("heading", { name: "Listings" }).waitFor();
const adminListings = page.getByRole("article");
assert.equal(await adminListings.count(), 3);
for (const row of await adminListings.all()) {
  assert((await row.locator(":scope > div").boundingBox()).width > 100);
}
const adminSearch = page.getByRole("searchbox", {
  name: "Search loaded records",
});
const adminStatus = page.getByRole("combobox", { name: /^Status/ });
const adminCategory = page.getByRole("combobox", { name: /^Category/ });
await adminSearch.fill("drill");
await adminCategory.selectOption("Garden");
assert.equal(await adminListings.count(), 0);
await adminCategory.selectOption("Power Tools");
await page.getByRole("combobox", { name: /^Society/ }).selectOption("society1");
await adminStatus.selectOption("active");
assert.equal(await adminListings.count(), 1);
const drill = adminListings.filter({ hasText: "Cordless drill" });
await drill.getByText("Inspect listing").click();
assert(await drill.getByText(/Condition: good/).isVisible());
const remove = drill.getByRole("button", { name: "Remove" });
page.once("dialog", (dialog) => dialog.dismiss());
await remove.click();
assert(await remove.isEnabled());
page.once("dialog", (dialog) => dialog.accept());
await remove.click();
await page
  .getByRole("status")
  .getByText("Listing removed from discovery.")
  .waitFor();
assert.equal(await adminListings.count(), 0);
await adminStatus.selectOption("removed");
assert(await drill.isVisible());
assert.equal(await remove.count(), 0);

await page.setViewportSize({ width: 390, height: 900 });
await page.goto("http://localhost:3000/__atlas-qa?view=onboarding");
const societySearch = page.getByLabel("Society, locality, or city");
const societyResult = page.getByRole("button", { name: /Paper Gardens/ });
await societySearch.fill("No such neighborhood");
await page.getByText(/No matching societies yet/).waitFor();
assert.equal(await societyResult.count(), 0);
await societySearch.fill("demo city");
await societyResult.waitFor();
await page
  .getByRole("region", { name: "Your society suggestions" })
  .getByText("Oak Court: pending")
  .waitFor();
await page.evaluate(() => {
  window.__atlasOnboardingCalls = [];
  window.__atlasMutation = (name, args) => {
    window.__atlasOnboardingCalls.push({ name, args });
    return null;
  };
});
await page.getByText("Can’t find your society? Suggest it").press("Enter");
const suggestionName = page.getByLabel("Society name *");
await suggestionName.fill("Cedar Court");
await page.getByLabel("Locality (optional)").fill("West End");
await page.getByRole("button", { name: "Send suggestion" }).click();
await page.getByRole("status").filter({ hasText: "sent for review" }).waitFor();
assert.equal(await suggestionName.inputValue(), "");
await societyResult.press("Enter");
await page.waitForFunction(() => window.__atlasReplacedPath === "/dashboard");
assert.deepEqual(await page.evaluate(() => window.__atlasOnboardingCalls), [
  {
    name: "suggestions:create",
    args: { name: "Cedar Court", locality: "West End", city: undefined },
  },
  { name: "users:selectSociety", args: { societyId: "society1" } },
]);

for (const width of [390, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("http://localhost:3000/__atlas-qa?view=listings&nav-pending");
  const nav = page.getByRole("navigation", {
    name:
      width === 390 ? "Mobile dashboard navigation" : "Dashboard navigation",
    exact: true,
  });
  const active = nav.getByRole("link", { name: "My Listings" });
  const next = nav.getByRole("link", { name: "My Activity" });
  if (width === 390) {
    await page.waitForFunction(() =>
      document.querySelector('nav[data-ready="true"]'),
    );
    assert.equal(
      await nav
        .locator(':scope > [aria-hidden="true"]')
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgb(217, 243, 106)",
    );
  }
  await next.click();
  await nav
    .getByRole("status")
    .filter({ hasText: "Opening My Activity…" })
    .waitFor();
  assert.equal(await active.getAttribute("aria-current"), "page");
  assert.equal(await next.getAttribute("aria-current"), null);
  assert.equal(
    await next.evaluate((el) => getComputedStyle(el).backgroundColor),
    "rgb(217, 243, 106)",
  );
  await page.screenshot({
    path: `artifacts/atlas/navigation-pending-${width}.png`,
    fullPage: true,
  });
}
for (const width of [390, 1000, 1001, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("http://localhost:3000/__atlas-qa?view=explore");
  const nav = page.getByRole("navigation", {
    name:
      width <= 1000 ? "Mobile dashboard navigation" : "Dashboard navigation",
    exact: true,
  });
  await page.waitForFunction(() =>
    document.querySelector('nav[data-ready="true"]'),
  );
  const marker = nav.locator(':scope > [aria-hidden="true"]');
  const first = await marker.boundingBox();
  await page.evaluate(() => {
    history.pushState({}, "", "/__atlas-qa?view=requests");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await marker.evaluate(
    (el) =>
      new Promise((resolve, reject) => {
        let attempts = 0;
        function check() {
          if (
            el
              .getAnimations()
              .some((animation) => animation.playState === "running")
          )
            return resolve();
          if (++attempts > 12)
            return reject(new Error("Navigation indicator did not animate"));
          requestAnimationFrame(check);
        }
        requestAnimationFrame(check);
      }),
  );
  await page.waitForTimeout(300);
  const destination = await nav
    .getByRole("link", { name: "My Activity" })
    .boundingBox();
  const arrived = await marker.boundingBox();
  assert(
    first &&
      arrived &&
      destination &&
      arrived.x > first.x &&
      Math.abs(arrived.x - destination.x) < 1,
  );
  await page.evaluate(() => {
    history.pushState({}, "", "/__atlas-qa?view=incoming");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  assert.equal(
    await nav
      .getByRole("link", { name: "My Activity" })
      .getAttribute("aria-current"),
    "page",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await marker.evaluate((el) => getComputedStyle(el).transitionDuration),
    "0s",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const listing = nav.getByRole("link", { name: "My Listings" });
  await listing.evaluate((el) =>
    el.addEventListener("click", (event) => event.preventDefault(), {
      once: true,
    }),
  );
  await listing.focus();
  await page.keyboard.press("Enter");
  assert.equal(await nav.getAttribute("data-instant"), "true");
  assert.equal(
    await marker.evaluate((el) => getComputedStyle(el).transitionDuration),
    "0s",
  );
  await page.evaluate(() => {
    history.pushState({}, "", "/__atlas-qa?view=listings");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.waitForFunction(() =>
    document.querySelector(
      'a[href="/dashboard/listings"][aria-current="page"]',
    ),
  );
}
await page.setViewportSize({ width: 1280, height: 900 });
await page.goto("http://localhost:3000/__atlas-qa?view=listing-new");
await page.evaluate(mockStudioSave);
const publishListing = page.getByRole("button", { name: "Publish listing" });
await publishListing.click();
await page.getByRole("alert").filter({ hasText: "Add a name" }).waitFor();
await page.getByLabel("Item name").fill("A useful drill");
await page.getByLabel("Description").fill("A drill for small projects.");
assert(
  await page
    .getByRole("complementary", { name: "Live listing preview" })
    .getByText("A useful drill")
    .isVisible(),
);
await page.getByLabel("Paid rental").check();
await page.getByLabel("Daily rate in INR").fill("175.50");
const listingPreview = page.getByRole("complementary", {
  name: "Live listing preview",
});
const previewPrice = listingPreview.getByText("₹175.50 / day", { exact: true });
const descriptionBox = await listingPreview
  .getByText("A drill for small projects.")
  .boundingBox();
const priceBox = await listingPreview
  .getByText("Daily rate", { exact: true })
  .locator("..")
  .boundingBox();
assert(
  descriptionBox &&
    priceBox &&
    priceBox.y - (descriptionBox.y + descriptionBox.height) >= 16,
  "Preview price needs breathing room",
);
assert.equal(
  await previewPrice.evaluate((el) => getComputedStyle(el).backgroundColor),
  "rgba(0, 0, 0, 0)",
);
assert(await previewPrice.isVisible());
await page.evaluate(() => {
  const decode = window.createImageBitmap.bind(window);
  window.createImageBitmap = (...args) =>
    new Promise((resolve, reject) => {
      window.__atlasFinishPhoto = () => {
        window.createImageBitmap = decode;
        decode(...args).then(resolve, reject);
      };
    });
});
await page
  .locator('input[type="file"]')
  .first()
  .setInputFiles("public/images/demo-rizvi/drill.jpg");
assert(
  await page.getByRole("button", { name: "Preparing photos…" }).isDisabled(),
);
await page.evaluate(() => window.__atlasFinishPhoto());
await page.getByAltText("Listing cover preview").waitFor();
await page
  .locator('input[type="file"]')
  .first()
  .setInputFiles("public/images/demo-rizvi/ladder.jpg");
for (const width of [360, 768, 1280, 1600]) {
  await page.setViewportSize({ width, height: 900 });
  const firstPhoto = await page
    .getByAltText("Listing photo 1", { exact: true })
    .boundingBox();
  const secondPhoto = await page
    .getByAltText("Listing photo 2", { exact: true })
    .boundingBox();
  assert(
    firstPhoto &&
      secondPhoto &&
      Math.abs(firstPhoto.y - secondPhoto.y) < 1 &&
      secondPhoto.x - (firstPhoto.x + firstPhoto.width) <= 11,
    `Photo gap at ${width}px`,
  );
}
await page.setViewportSize({ width: 1280, height: 900 });
await page.getByRole("button", { name: "Set photo 2 as cover" }).click();
assert.equal(
  await page.getByAltText("Listing cover preview").getAttribute("src"),
  await page.getByAltText("Listing photo 1").getAttribute("src"),
);
await page.getByRole("button", { name: "Remove photo 2" }).click();
assert.equal(await page.getByAltText(/^Listing photo \d+$/).count(), 1);
await page.getByLabel("Daily rate in INR").fill("0");
await publishListing.click();
await page
  .getByRole("alert")
  .filter({ hasText: "Daily rate must be" })
  .waitFor();
assert.equal(await page.evaluate(() => window.__atlasStudioCalls.length), 0);
await page.getByLabel("Daily rate in INR").fill("175.50");

function mockStudioSave() {
  window.__atlasStudioCalls = [];
  window.__atlasMutation = (name, args) => {
    window.__atlasStudioCalls.push({ name, args });
    switch (name) {
      case "tools:create":
        return "studio-draft";
      case "photos:uploadUrl":
        return { url: "/__atlas-photo-upload", ticketId: "studio-ticket" };
      case "photos:register":
        return "studio-photo";
      case "tools:update":
      case "photos:setForTool":
      case "tools:setStatus":
        return null;
      default:
        throw new Error(`Unexpected Studio mutation: ${name}`);
    }
  };
}
let uploadAttempts = 0;
await page.route("**/__atlas-photo-upload", async (route) => {
  assert.equal(route.request().method(), "POST");
  assert.equal(route.request().headers()["content-type"], "image/jpeg");
  assert(await page.getByLabel("Item name").isDisabled());
  uploadAttempts += 1;
  return uploadAttempts === 1
    ? route.fulfill({ status: 503 })
    : route.fulfill({ json: { storageId: "studio-storage" } });
});
await publishListing.click();
await page
  .getByRole("alert")
  .filter({ hasText: "Your changes are still here" })
  .waitFor();
assert(await listingPreview.getByAltText("Listing cover preview").isVisible());
assert.equal(await page.getByLabel("Item name").inputValue(), "A useful drill");
assert(await page.getByLabel("Item name").isEnabled());
await publishListing.click();
await page.waitForFunction(
  () => window.__atlasPushedPath === "/dashboard/listings",
);
assert.equal(uploadAttempts, 2);
const studioCalls = await page.evaluate(() => window.__atlasStudioCalls);
assert.deepEqual(
  studioCalls.map(({ name }) => name),
  [
    "tools:create",
    "photos:uploadUrl",
    "tools:update",
    "photos:uploadUrl",
    "photos:register",
    "photos:setForTool",
    "tools:setStatus",
  ],
);
assert.equal(studioCalls[2].args.toolId, "studio-draft");
assert.deepEqual(studioCalls[5].args, {
  toolId: "studio-draft",
  photoIds: ["studio-photo"],
});
assert.deepEqual(studioCalls[6].args, {
  toolId: "studio-draft",
  status: "active",
});

await page.setViewportSize({ width: 390, height: 900 });
await page.goto("http://localhost:3000/__atlas-qa?view=listing-edit");
assert.equal(await page.getByLabel("Item name").inputValue(), "Cordless drill");
const savedCover = await listingPreview
  .getByAltText("Listing cover preview")
  .boundingBox();
const savedTitle = await listingPreview
  .getByRole("heading", { name: "Cordless drill" })
  .boundingBox();
assert(
  savedCover && savedTitle && savedTitle.y >= savedCover.y + savedCover.height,
  "The mobile preview title should sit below the saved cover",
);
await page.evaluate(() => {
  Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
    value: async () => {
      throw new Error("denied");
    },
  });
});
await page.getByRole("button", { name: "Take Photo" }).click();
const studioCamera = page.getByRole("dialog", { name: "Take photo" });
await studioCamera
  .getByLabel("Use device camera")
  .waitFor({ state: "attached" });
await studioCamera.getByRole("button", { name: "Cancel" }).click();
await studioCamera.waitFor({ state: "hidden" });
await page.evaluate(mockStudioSave);
await page.getByLabel("Item name").fill("Updated cordless drill");
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForFunction(
  () => window.__atlasPushedPath === "/dashboard/listings",
);
const editCalls = await page.evaluate(() => window.__atlasStudioCalls);
assert.deepEqual(
  editCalls.map(({ name }) => name),
  ["tools:update", "photos:setForTool"],
);
assert.equal(editCalls[0].args.name, "Updated cordless drill");
assert.deepEqual(editCalls[1].args, { toolId: "tool0", photoIds: ["photo0"] });
assert.deepEqual(errors, []);
for (const width of [360, 390, 768, 1280, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("http://localhost:3000/__atlas-qa?view=public-explore");
  const listings = page.getByRole("list", { name: "Public listings" });
  assert.equal(await listings.getByRole("listitem").count(), 6);
  assert.equal(await listings.getByText("Sample listing").count(), 0);
  assert.equal(await listings.getByText("Demo · Cordless drill").count(), 0);
  assert.equal(await listings.locator("img").count(), 5);
  assert.equal(
    await listings
      .getByRole("listitem")
      .filter({ hasText: "Step ladder" })
      .locator("svg")
      .count(),
    1,
  );
  assert.equal(await listings.getByText(/₹|Rohan|per day/i).count(), 0);
  await page.screenshot({
    path: `artifacts/atlas/public-explore-${width}.png`,
    fullPage: true,
  });
  await page
    .getByRole("searchbox", { name: "Search listings by name" })
    .fill("drill");
  assert.equal(await listings.getByRole("listitem").count(), 1);
  await page.getByRole("button", { name: "Garden", exact: true }).click();
  await page.getByRole("heading", { name: "No listings found" }).waitFor();
  await page
    .getByRole("searchbox", { name: "Search listings by name" })
    .fill("");
  assert.equal(await listings.getByRole("listitem").count(), 1);
  assert(
    await listings.getByRole("heading", { name: "Garden pruner" }).isVisible(),
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
}
for (const width of [390, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("http://localhost:3000/__atlas-qa?view=shelf");
  const track = page.locator(".shelf-track");
  await track.waitFor();
  assert.equal(await page.locator(".shelf-track > li").count(), 10);
  assert.equal(await page.getByText("Example", { exact: true }).count(), 10);
  await page.locator("#tools").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `artifacts/atlas/shelf-${width}.png` });
  if (width === 390) {
    // Native swipe carousel on narrow screens.
    assert(await track.evaluate((el) => el.scrollWidth > el.clientWidth + 100));
  } else {
    // Vertical scroll inside the pinned section moves the track sideways.
    const before = await track.evaluate((el) => el.getBoundingClientRect().x);
    await page.evaluate(() => {
      const section = document.querySelector(".shelf-gallery");
      window.scrollTo({
        top: section.offsetTop + section.offsetHeight / 2 - innerHeight / 2,
        behavior: "instant",
      });
    });
    await page.waitForTimeout(200);
    const after = await track.evaluate((el) => el.getBoundingClientRect().x);
    assert(
      after < before - 200,
      `Shelf track did not move (${before} → ${after})`,
    );
    await page.screenshot({ path: `artifacts/atlas/shelf-${width}-mid.png` });
  }
}
assert.deepEqual(errors, []);
console.log(
  "75 viewport/page renders and interaction checks passed. Fixture UI only.",
);
await browser.close();
