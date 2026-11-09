import { expect, test } from "@playwright/test";

test("landing hero, explore link, and catalog state", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: /The things you need are closer than you think/i,
    }),
  ).toBeVisible();
  await expect(
    page.locator(".hero-actions").getByRole("link", { name: /Explore tools/i }),
  ).toHaveAttribute("href", "#tools");
  await expect(page.locator(".hero-visual img")).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".hero-visual img")
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0);
  await expect(
    page.locator(".catalog-state, .catalog-card").first(),
  ).toBeVisible();
});

for (const width of [360, 390, 768, 1280]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/");
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
  });
}

test("protected routes require sign-in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/sign-in/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/sign-in/);
});

test("stable landing screenshots", async ({ page }) => {
  test.skip(
    process.platform !== "darwin",
    "Screenshot baselines were captured on macOS",
  );
  test.skip(
    Boolean(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
      process.env.NEXT_PUBLIC_CONVEX_URL,
    ),
    "Screenshot baselines show the unconfigured catalog state",
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page).toHaveScreenshot("landing-desktop.png", {
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page).toHaveScreenshot("landing-mobile.png", {
    fullPage: true,
    animations: "disabled",
  });
});
