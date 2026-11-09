import { expect, test } from "@playwright/test";

test("landing hero, catalog entry, and journal navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page
      .locator(".marketing-header")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Most things spend their life.*waiting/,
  );
  await expect(
    page.getByRole("link", { name: "Find what’s next door" }),
  ).toHaveAttribute("href", "#tools");
  await expect(
    page.getByRole("img", { name: "A lime and graphite cordless drill" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Find what’s next door" }).click();
  await expect(
    page.locator(".catalog-state, .catalog-card").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in to lend or borrow" }),
  ).toHaveAttribute("href", "/dashboard");
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Journal" })
    .click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Ideas worth",
  );
  await page.getByRole("link", { name: "For communities" }).click();
  await expect(page.getByText("A FUTURE INTEGRATION CONCEPT")).toBeVisible();
  expect(errors).toEqual([]);
});

for (const width of [360, 390, 768, 1280, 1600]) {
  test(`story forwards, backwards, and screenshots at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator(".traveling-drill")).toBeVisible();
    // Wait for the client timeline, not an arbitrary animation duration.
    await expect
      .poll(() => page.locator(".traveling-drill").getAttribute("style"))
      .not.toBeNull();
    await page.screenshot({ path: testInfo.outputPath(`hero-${width}.png`) });
    const initial = await page
      .locator(".traveling-drill")
      .evaluate((el) =>
        new DOMMatrix(getComputedStyle(el).transform).toString(),
      );
    for (const id of ["nearby", "request", "handover", "in-use", "return"]) {
      await page
        .locator(`#${id}`)
        .evaluate((el) =>
          el.scrollIntoView({ behavior: "instant", block: "start" }),
        );
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await expect(page.locator(`#${id} h2`)).toBeVisible();
    }
    const returned = await page
      .locator(".traveling-drill")
      .evaluate((el) =>
        new DOMMatrix(getComputedStyle(el).transform).toString(),
      );
    expect(returned).not.toBe(initial);
    await page
      .locator("#handover")
      .evaluate((el) =>
        el.scrollIntoView({ behavior: "instant", block: "start" }),
      );
    await page.screenshot({
      path: testInfo.outputPath(`handover-${width}.png`),
    });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect
      .poll(() =>
        page
          .locator(".traveling-drill")
          .evaluate((el) =>
            new DOMMatrix(getComputedStyle(el).transform).toString(),
          ),
      )
      .toBe(initial);
    await page.getByRole("button", { name: "Within 1 km" }).click();
    await expect(
      page.getByRole("button", { name: "Within 1 km" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByRole("status").filter({ hasText: "3 illustrative societies" }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`discovery-${width}.png`),
    });
  });
}

test("reduced motion keeps every chapter and keyboard controls accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".story-chapter")).toHaveCount(6);
  for (const chapter of await page.locator(".story-chapter").all()) {
    await chapter.scrollIntoViewIfNeeded();
    await expect(chapter).toBeVisible();
  }
  await expect(page.locator(".traveling-drill")).toHaveCSS("transform", "none");
  await page.getByRole("button", { name: "Within 500 m" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Within 500 m" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("server-rendered story remains readable without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator(".story-chapter")).toHaveCount(6);
  await expect(
    page.getByRole("link", { name: "Find what’s next door" }),
  ).toHaveAttribute("href", "#tools");
  await page.locator("#return").scrollIntoViewIfNeeded();
  await expect(page.locator("#return h2")).toBeVisible();
  await context.close();
});

test("protected routes require sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(
    page.getByRole("heading", { name: /Good to see you|Sign in to LendLoop/ }),
  ).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("stable landing screenshots", async ({ page }) => {
  test.skip(
    process.platform !== "darwin",
    "Visual baselines are captured on macOS; responsive assertions run on every OS.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const [width, height, name] of [
    [1280, 900, "desktop"],
    [390, 844, "mobile"],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    await expect(
      page
        .locator(".marketing-header")
        .getByRole("link", { name: "Sign in", exact: true }),
    ).toBeVisible();
    await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
    await expect(page).toHaveScreenshot(`landing-${name}.png`, {
      animations: "disabled",
    });
  }
});

test("touch scrolling and changing motion preferences preserve the story", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: 190, y: 700 }],
  });
  for (let y = 650; y >= 200; y -= 50) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 190, y }],
    });
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(100);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".traveling-drill")).toHaveCSS("transform", "none");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("#handover").scrollIntoViewIfNeeded();
  await expect(page.locator("#handover h2")).toBeVisible();
  await context.close();
});
