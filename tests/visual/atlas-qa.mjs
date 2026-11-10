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
      const fields =
        view === "profile"
          ? page.getByRole("textbox")
          : page.locator(".handover-form input, .handover-form textarea");
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
assert.equal(await page.locator(".explore-page .tool-card").count(), 6);
await page
  .getByRole("combobox", { name: "Search distance" })
  .selectOption("500");
assert.equal(await page.evaluate(() => window.__atlasExploreArgs.scope), "500");
assert.equal(
  await page.getByRole("combobox", { name: "Search distance" }).inputValue(),
  "500",
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
const activityNav = page.getByRole("navigation", { name: "Activity views" });
assert.equal(
  await activityNav
    .getByRole("link", { name: "Things I’m borrowing" })
    .getAttribute("aria-current"),
  "page",
);
await page.getByRole("button", { name: "Completed returns" }).click();
assert.equal(await page.getByRole("article").count(), 1);
assert.equal(
  await page
    .getByRole("button", { name: "Completed returns" })
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
await page.goto("http://localhost:3000/__atlas-qa?view=admin-listings");
assert.equal(await page.locator(".admin-listing").count(), 3);
for (const row of await page.locator(".admin-listing").all()) {
  assert((await row.locator(".admin-listing-info").boundingBox()).width > 100);
}
for (const width of [390, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("http://localhost:3000/__atlas-qa?view=explore");
  const nav = page.getByRole("navigation", {
    name: width < 1000 ? "Mobile dashboard navigation" : "Dashboard navigation",
  });
  await page.waitForFunction(() =>
    document.querySelector('nav[data-ready="true"]'),
  );
  const marker = nav.locator(".nav-indicator");
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
await page.getByRole("button", { name: "Preview listing" }).click();
assert(await page.getByRole("alert").isVisible());
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
const descriptionBox = await page
  .locator(".studio-preview-content p")
  .boundingBox();
const priceBox = await page.locator(".studio-preview-price").boundingBox();
assert(
  descriptionBox &&
    priceBox &&
    priceBox.y - (descriptionBox.y + descriptionBox.height) >= 16,
  "Preview price needs breathing room",
);
assert.equal(
  await page
    .locator(".studio-preview-price strong")
    .evaluate((el) => getComputedStyle(el).backgroundColor),
  "rgba(0, 0, 0, 0)",
);
assert(
  await page
    .getByRole("complementary", { name: "Live listing preview" })
    .getByText("₹175.50 / day")
    .isVisible(),
);
await page
  .locator('input[type="file"]')
  .first()
  .setInputFiles("public/images/demo-rizvi/drill.jpg");
await page.getByAltText("Listing cover preview").waitFor();
await page
  .locator('input[type="file"]')
  .first()
  .setInputFiles("public/images/demo-rizvi/ladder.jpg");
for (const width of [360, 768, 1280, 1600]) {
  await page.setViewportSize({ width, height: 900 });
  const firstPhoto = await page.locator(".photo-tile").nth(0).boundingBox();
  const secondPhoto = await page.locator(".photo-tile").nth(1).boundingBox();
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
assert.equal(await page.locator(".photo-tile").count(), 1);
await page.getByLabel("Daily rate in INR").fill("0");
await page.getByRole("button", { name: "Preview listing" }).click();
assert(await page.getByRole("alert").isVisible());
await page.getByLabel("Daily rate in INR").fill("175.50");
await page.getByRole("button", { name: "Preview listing" }).click();
assert(
  await page.getByRole("heading", { name: "Review your listing" }).isVisible(),
);
await page.getByRole("button", { name: "Back to edit" }).click();
assert.equal(await page.getByLabel("Item name").inputValue(), "A useful drill");
await page.goto("http://localhost:3000/__atlas-qa?view=listing-edit");
assert.equal(await page.getByLabel("Item name").inputValue(), "Cordless drill");
assert(await page.getByAltText("Listing cover preview").isVisible());
assert.deepEqual(errors, []);
for (const width of [390, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("http://localhost:3000/__atlas-qa?view=shelf");
  const track = page.locator(".shelf-track");
  await track.waitFor();
  assert.equal(await page.locator(".shelf-track > li").count(), 7);
  assert(await page.getByRole("link", { name: "List an item" }).isVisible());
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
  "70 viewport/page renders + edit form and sharing checks passed. Fixture UI only.",
);
await browser.close();
