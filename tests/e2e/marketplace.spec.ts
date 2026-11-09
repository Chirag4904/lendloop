import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test.skip(
  !process.env.E2E_CLERK_USER_EMAIL ||
    !process.env.CLERK_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_CONVEX_URL ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_"),
  "Requires an isolated Clerk and Convex development setup",
);

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l3sAAAAASUVORK5CYII=",
  "base64",
);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Good things, closer than you think." }),
  ).toBeVisible();
});

test("create, edit, discover, unlist and relist a listing", async ({
  page,
}) => {
  const name = `E2E Drill ${Date.now()}`;
  await page.getByRole("link", { name: "List an item" }).click();
  await page.getByLabel("Item name").fill(name);
  await page
    .getByLabel("Description")
    .fill("A drill with two batteries and a carry case.");
  await page.getByLabel("Category").selectOption("Power Tools");
  await page.getByLabel("Paid rental").check();
  await page.getByLabel("Daily rate in INR").fill("175.50");
  await page.getByRole("button", { name: "Preview listing" }).click();
  await expect(page.getByText("₹175.50 / day")).toBeVisible();
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect(page).toHaveURL(/\/dashboard\/listings$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name }) })
    .getByRole("link", { name: "Edit" })
    .click();
  await page.getByLabel("Item name").fill(`${name} updated`);
  await page.getByRole("button", { name: "Preview listing" }).click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: `${name} updated` }),
  ).toBeVisible();
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: `${name} updated` }) })
    .getByRole("button", { name: "Unlist" })
    .click();
  await expect(page.getByText("Unlisted").last()).toBeVisible();
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: `${name} updated` }) })
    .getByRole("button", { name: "Relist" })
    .click();
  await page.goto("/dashboard");
  await page.getByLabel("Search tools").fill(`${name} updated`);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("Category").selectOption("Power Tools");
  await page
    .getByRole("combobox", { name: "Price", exact: true })
    .selectOption("paid");
  await page.getByRole("button", { name: "Show results" }).click();
  await page.getByRole("button", { name: "Within 500 m" }).click();
  await expect(
    page.getByRole("heading", { name: `${name} updated` }),
  ).toBeVisible();
  await page.getByRole("link", { name: `View ${name} updated` }).click();
  await expect(
    page.getByText("A drill with two batteries and a carry case."),
  ).toBeVisible();
  await page.goto("/dashboard/listings");
  page.once("dialog", (dialog) => void dialog.accept());
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: `${name} updated` }) })
    .getByRole("button", { name: "Archive" })
    .click();
});

test("photo previews, cover order, removal and failed upload retry", async ({
  page,
}) => {
  const name = `E2E Camera ${Date.now()}`;
  await page.goto("/dashboard/listings/new");
  await page.getByLabel("Item name").fill(name);
  await page.getByLabel("Description").fill("A small test item with photos.");
  await page
    .locator('input[type="file"]')
    .first()
    .setInputFiles([
      { name: "one.png", mimeType: "image/png", buffer: png },
      { name: "two.png", mimeType: "image/png", buffer: png },
    ]);
  await expect(page.locator(".photo-tile")).toHaveCount(2);
  await page.getByRole("button", { name: "Set photo 2 as cover" }).click();
  await expect(
    page.locator(".photo-tile").first().locator(".cover-tag"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Move photo 2 earlier" }).click();
  await page.getByRole("button", { name: "Remove photo 2" }).click();
  await expect(page.locator(".photo-tile")).toHaveCount(1);
  await page.getByRole("button", { name: "Preview listing" }).click();
  let failed = false;
  await page.route("**/*", async (route) => {
    if (
      !failed &&
      route.request().method() === "POST" &&
      route.request().url().includes("/api/storage/upload")
    ) {
      failed = true;
      await route.abort();
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "retry" }),
  ).toBeVisible();
  await page.unrouteAll();
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect(page).toHaveURL(/\/dashboard\/listings$/);
  page.once("dialog", (dialog) => void dialog.accept());
  await page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name }) })
    .getByRole("button", { name: "Archive" })
    .click();
});

test("camera denial offers device capture fallback", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => {
          throw new Error("denied");
        },
      },
      configurable: true,
    });
  });
  await page.goto("/dashboard/listings/new");
  await page.getByRole("button", { name: "Take Photo" }).click();
  await expect(page.getByRole("dialog", { name: "Take photo" })).toBeVisible();
  await expect(
    page.getByRole("alert").filter({ hasText: "denied" }),
  ).toBeVisible();
  await expect(page.getByText("Use device camera")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog", { name: "Take photo" })).toHaveCount(0);
});

test("camera capture supports retake, use and releases the stream", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#2854c5";
    context.fillRect(0, 0, 320, 240);
    const stream = canvas.captureStream(10);
    const track = stream.getVideoTracks()[0];
    const stop = track.stop.bind(track);
    (window as Window & { cameraStopped?: boolean }).cameraStopped = false;
    track.stop = () => {
      (window as Window & { cameraStopped?: boolean }).cameraStopped = true;
      stop();
    };
    Object.defineProperty(navigator, "mediaDevices", {
      value: { getUserMedia: async () => stream },
      configurable: true,
    });
  });
  await page.goto("/dashboard/listings/new");
  await page.getByRole("button", { name: "Take Photo" }).click();
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((video) => (video as HTMLVideoElement).videoWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Capture", exact: true }).click();
  await expect(page.getByAltText("Captured photo preview")).toBeVisible();
  await page.getByRole("button", { name: "Retake" }).click();
  await expect
    .poll(() =>
      page
        .locator("video")
        .evaluate((video) => (video as HTMLVideoElement).videoWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: "Capture", exact: true }).click();
  await page.getByRole("button", { name: "Use photo" }).click();
  await expect(page.locator(".photo-tile")).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { cameraStopped?: boolean }).cameraStopped,
      ),
    )
    .toBe(true);
});

test("unsupported camera still offers a file capture option", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "mediaDevices", {
      value: undefined,
      configurable: true,
    }),
  );
  await page.goto("/dashboard/listings/new");
  await page.getByRole("button", { name: "Take Photo" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "unavailable" }),
  ).toBeVisible();
  await expect(page.getByText("Use device camera")).toBeVisible();
});

for (const width of [360, 390, 768, 1280, 1440]) {
  test(`marketplace and listing form fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", {
        name: "Good things, closer than you think.",
      }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.goto("/dashboard/listings/new");
    await expect(page.getByLabel("Item name")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.getByRole("button", { name: "Take Photo" }).click();
    const bounds = await page
      .getByRole("dialog", { name: "Take photo" })
      .boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
  });
}
