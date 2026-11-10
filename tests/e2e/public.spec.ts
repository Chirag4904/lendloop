import { expect, test } from "@playwright/test";

test("landing hero, catalog entry, and journal navigation", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page
      .getByRole("banner")
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
    await expect(page.getByRole("banner")).toHaveCSS(
      "position",
      width >= 1280 ? "absolute" : "static",
    );
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
    await expect
      .poll(() =>
        page.locator(".stage-canvas").evaluate((el) => {
          const bounds = el.getBoundingClientRect();
          return Math.abs(bounds.left + bounds.width / 2 - innerWidth / 2);
        }),
      )
      .toBeLessThan(2);
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

for (const width of [360, 1440]) {
  test(`handover holds before release and reverses at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator(".scroll-story")).toHaveClass(/is-enhanced/);
    await page.evaluate(() => document.fonts.ready);
    const seek = async (progress: number) => {
      await page.evaluate((progress) => {
        const section = document.querySelector<HTMLElement>("#handover")!;
        const stage = document.querySelector<HTMLElement>(".story-stage")!;
        const stacked = stage.offsetHeight < innerHeight;
        const stageOffset = stacked ? stage.offsetHeight : 0;
        const start =
          section.getBoundingClientRect().top + scrollY - stageOffset;
        const distance = section.offsetHeight - innerHeight + stageOffset;
        window.scrollTo({
          top: start + distance * progress,
          behavior: "instant",
        });
        return new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      }, progress);
    };
    const grip = page.locator(".handover-receiver-grip");
    const lender = page.locator(".handover-lender-grip");
    const drill = page.locator(".traveling-drill");
    await seek(0);
    await expect(grip).toHaveCSS("opacity", "1");
    await expect(lender).toHaveCSS("opacity", "1");
    const initialDrill = await drill.boundingBox();
    const openOutline = await grip.getAttribute("d");
    const closedLender = await lender.getAttribute("d");
    await expect(page.locator(".handover-receiver-open")).toHaveCSS(
      "opacity",
      "0",
    );
    await expect(grip).toHaveAttribute(
      "d",
      (await page.locator(".handover-receiver-open").getAttribute("d"))!,
    );
    await seek(0.27);
    const halfwayOutline = await grip.getAttribute("d");
    expect(halfwayOutline).not.toBe(openOutline);
    await expect(grip).toHaveCSS("opacity", "1");
    await seek(0.44);
    const closedOutline = await grip.getAttribute("d");
    expect(closedOutline).not.toBe(halfwayOutline);
    await expect(lender).toHaveAttribute("d", closedLender!);
    await expect(grip).toHaveCSS("opacity", "1");
    await expect(lender).toHaveCSS("opacity", "1");
    await expect(page.locator(".handover-status")).toHaveText("Handing over");
    const sharedGrip = await grip.boundingBox();
    const sharedDrill = await drill.boundingBox();
    expect(Math.abs(sharedDrill!.x - initialDrill!.x)).toBeLessThan(1);
    await page.screenshot({
      path: testInfo.outputPath(`shared-hold-${width}.png`),
    });
    await seek(0.65);
    await expect(lender).toHaveCSS("opacity", "1");
    await expect(grip).toHaveAttribute("d", closedOutline!);
    await expect(lender).toHaveAttribute(
      "d",
      (await page.locator(".handover-lender-open").getAttribute("d"))!,
    );
    await expect(page.locator(".handover-lender-open")).toHaveCSS(
      "opacity",
      "0",
    );
    await seek(0.96);
    await expect
      .poll(async () => (await drill.boundingBox())!.x)
      .toBeGreaterThan(sharedDrill!.x + 20);
    const carriedGrip = await grip.boundingBox();
    const carriedDrill = await drill.boundingBox();
    for (const axis of ["x", "y"] as const) {
      expect(
        Math.abs(
          carriedGrip![axis] -
            sharedGrip![axis] -
            (carriedDrill![axis] - sharedDrill![axis]),
        ),
      ).toBeLessThan(1);
    }
    await expect(page.locator(".handover-status")).toHaveText("Handed over");
    await page.screenshot({
      path: testInfo.outputPath(`received-${width}.png`),
    });
    await seek(0.44);
    await expect(lender).toHaveAttribute("d", closedLender!);
    await expect(grip).toHaveAttribute("d", closedOutline!);
    await expect(lender).toHaveCSS("opacity", "1");
    await expect(grip).toHaveCSS("opacity", "1");
    await seek(0);
    await expect(grip).toHaveCSS("opacity", "1");
    await expect(grip).toHaveAttribute("d", openOutline!);
    await expect(page.locator(".handover-receiver-open")).toHaveCSS(
      "opacity",
      "0",
    );
    await expect
      .poll(async () =>
        Math.abs((await drill.boundingBox())!.x - initialDrill!.x),
      )
      .toBeLessThan(1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("#handover").scrollIntoViewIfNeeded();
    await expect(grip).toHaveCSS("opacity", "1");
    await expect(lender).toHaveCSS("opacity", "0");
    await expect(grip).toHaveAttribute("d", closedOutline!);
    await expect(drill).toHaveCSS("transform", "none");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await seek(0);
    await expect(grip).toHaveCSS("opacity", "1");
    await expect(grip).toHaveAttribute("d", openOutline!);
    await expect(lender).toHaveAttribute("d", closedLender!);
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

test("auth pages fit on narrow phones", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  for (const [route, name] of [
    ["/sign-in", /Good to see you/],
    ["/sign-up", /Meet your new/],
  ] as const) {
    await page.goto(route);
    const heading = page.getByRole("heading", { level: 1, name });
    await expect(heading).toBeVisible();
    if (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
      await expect(page.locator(".cl-cardBox")).toBeVisible();
    }
    await page.evaluate(() => document.fonts.ready);
    expect(
      await heading.evaluate((node) => node.scrollWidth <= node.clientWidth),
    ).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
  }
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
        .getByRole("banner")
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

for (const width of [390, 1440]) {
  test(`branded not found page at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/this-neighborhood-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "Looks like this page wandered off." }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Back to home" }),
    ).toHaveAttribute("href", "/");
    await expect(page.getByRole("link", { name: "Back to home" })).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`not-found-${width}.png`),
      fullPage: true,
    });
  });
}
