import { selectBorrowDates } from "./select-borrow-dates";
import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

const isolated = Boolean(
  process.env.CLERK_SECRET_KEY &&
  process.env.NEXT_PUBLIC_CONVEX_URL &&
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_"),
);
test.skip(!isolated, "Requires isolated development Clerk and Convex services");

test("ordinary user cannot open admin data", async ({ page }) => {
  test.skip(
    !process.env.E2E_CLERK_USER_EMAIL,
    "Requires an isolated normal user",
  );
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });
  await page.goto("/admin");
  await expect(page.getByRole("alert")).toContainText("Admin access required");
  await expect(page.getByText("Total users")).toHaveCount(0);
});

test("admin pages stay usable at phone, tablet, and desktop widths", async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_CLERK_ADMIN_EMAIL,
    "Requires a provisioned isolated admin account",
  );
  await page.goto("/");
  await clerk.signIn({
    page,
    emailAddress: process.env.E2E_CLERK_ADMIN_EMAIL!,
  });
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByText("Total users")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    for (const section of [
      "users",
      "listings",
      "loans",
      "societies",
      "society-suggestions",
      "audit",
      "automation",
    ]) {
      await page.goto(`/admin/${section}`);
      await expect(
        page.getByRole("navigation", { name: "Admin navigation" }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    }
  }
});

async function signedIn(
  browser: import("@playwright/test").Browser,
  emailAddress: string,
) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await clerk.signIn({ page, emailAddress });
  return { context, page };
}
async function newListing(page: import("@playwright/test").Page) {
  const name = `Admin E2E drill ${Date.now()}`;
  await page.goto("/dashboard/listings/new");
  await page.getByLabel("Item name").fill(name);
  await page.getByLabel("Description").fill("A drill for the admin flow test.");
  await page.getByLabel("Category").selectOption("Power Tools");
  await page.getByRole("button", { name: "Publish listing" }).click();
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name }) });
  const href = await card
    .getByRole("link", { name, exact: true })
    .getAttribute("href");
  expect(href).toBeTruthy();
  return { name, href: href! };
}

test("admin independently grants and revokes trust badges", async ({
  browser,
}) => {
  test.skip(
    !process.env.E2E_CLERK_ADMIN_EMAIL ||
      !process.env.E2E_ADMIN_TARGET_DISPLAY_NAME,
    "Requires a provisioned admin and a uniquely named test user",
  );
  const admin = await signedIn(browser, process.env.E2E_CLERK_ADMIN_EMAIL!);
  try {
    await admin.page.goto("/admin/users");
    const name = process.env.E2E_ADMIN_TARGET_DISPLAY_NAME!;
    for (
      let page = 0;
      page < 10 &&
      (await admin.page
        .getByRole("article")
        .filter({ hasText: name })
        .count()) === 0;
      page++
    )
      await admin.page.getByRole("button", { name: "Load more" }).click();
    const row = admin.page.getByRole("article").filter({ hasText: name });
    await expect(row).toHaveCount(1);
    for (const badge of ["Trusted Lender", "Trusted Borrower"]) {
      admin.page.once("dialog", (dialog) => dialog.accept());
      await row.getByRole("button", { name: new RegExp(badge) }).click();
      await expect(
        row.getByRole("button", { name: `✓ ${badge}` }),
      ).toBeVisible();
    }
    admin.page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "✓ Trusted Lender" }).click();
    await expect(
      row.getByRole("button", { name: "+ Trusted Lender" }),
    ).toBeVisible();
    await expect(
      row.getByRole("button", { name: "✓ Trusted Borrower" }),
    ).toBeVisible();
    admin.page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "✓ Trusted Borrower" }).click();
  } finally {
    await admin.context.close();
  }
});

test("admin removes a user's listing from discovery", async ({ browser }) => {
  test.skip(
    !process.env.E2E_CLERK_ADMIN_EMAIL || !process.env.E2E_CLERK_USER_EMAIL,
    "Requires an admin and an onboarded normal user",
  );
  const user = await signedIn(browser, process.env.E2E_CLERK_USER_EMAIL!);
  const admin = await signedIn(browser, process.env.E2E_CLERK_ADMIN_EMAIL!);
  try {
    const { name } = await newListing(user.page);
    await admin.page.goto("/admin/listings");
    await admin.page.getByLabel("Search loaded records").fill(name);
    const row = admin.page.getByRole("article").filter({ hasText: name });
    await expect(row).toBeVisible();
    admin.page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Remove" }).click();
    await expect(row.getByText("removed", { exact: true })).toBeVisible();
    await user.page.goto("/dashboard");
    await user.page.getByLabel("Search tools").fill(name);
    await expect(user.page.getByRole("heading", { name })).toHaveCount(0);
  } finally {
    await user.context.close();
    await admin.context.close();
  }
});

test("admin approves a suggestion and makes it selectable", async ({
  browser,
}) => {
  test.skip(
    !process.env.E2E_CLERK_ADMIN_EMAIL ||
      !process.env.E2E_CLERK_SUGGESTER_EMAIL,
    "Requires an admin and a fresh, not yet onboarded suggester",
  );
  const user = await signedIn(browser, process.env.E2E_CLERK_SUGGESTER_EMAIL!);
  const admin = await signedIn(browser, process.env.E2E_CLERK_ADMIN_EMAIL!);
  try {
    const name = `E2E Society ${Date.now()}`;
    await user.page.goto("/onboarding");
    await user.page.getByText("Can’t find your society? Suggest it").click();
    await user.page.getByLabel("Society name *").fill(name);
    await user.page.getByLabel("Locality (optional)").fill("North");
    await user.page.getByLabel("City (optional)").fill("Kolkata");
    await user.page.getByRole("button", { name: "Send suggestion" }).click();
    await admin.page.goto("/admin/society-suggestions");
    await admin.page.getByLabel("Search loaded records").fill(name);
    const row = admin.page.getByRole("article").filter({ hasText: name });
    await row.getByRole("button", { name: "Review" }).click();
    await row.getByLabel("latitude").fill("22.57");
    await row.getByLabel("longitude").fill("88.36");
    admin.page.once("dialog", (dialog) => dialog.accept());
    await row.getByRole("button", { name: "Approve suggestion" }).click();
    await expect(row.getByText("approved", { exact: true })).toBeVisible();
    await user.page.reload();
    await expect(user.page.getByText(`${name}:`)).toBeVisible();
    await user.page.getByLabel("Society, locality, or city").fill(name);
    await expect(
      user.page.getByRole("button", { name: new RegExp(name) }),
    ).toBeVisible();
  } finally {
    await user.context.close();
    await admin.context.close();
  }
});

test("admin inspects a confirmed loan without private handover details", async ({
  browser,
}) => {
  test.skip(
    !process.env.E2E_CLERK_ADMIN_EMAIL ||
      !process.env.E2E_CLERK_USER_EMAIL ||
      !process.env.E2E_CLERK_BORROWER_EMAIL,
    "Requires admin, lender, and borrower test accounts",
  );
  const lender = await signedIn(browser, process.env.E2E_CLERK_USER_EMAIL!);
  const borrower = await signedIn(
    browser,
    process.env.E2E_CLERK_BORROWER_EMAIL!,
  );
  const admin = await signedIn(browser, process.env.E2E_CLERK_ADMIN_EMAIL!);
  try {
    const { name, href } = await newListing(lender.page);
    await borrower.page.goto(href);
    await borrower.page
      .getByRole("button", { name: "Request to Borrow" })
      .click();
    const date = new Date(Date.now() + 3 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    await selectBorrowDates(borrower.page, date, date);
    await borrower.page.getByRole("button", { name: "Send request" }).click();
    await lender.page.goto("/dashboard/incoming");
    const incoming = lender.page
      .getByRole("article")
      .filter({ has: lender.page.getByRole("heading", { name }) });
    lender.page.once("dialog", (dialog) => dialog.accept());
    await incoming.getByRole("button", { name: "Approve Request" }).click();
    await admin.page.goto("/admin/loans");
    await admin.page.getByLabel("Search loaded records").fill(name);
    const row = admin.page.locator(".admin-loan").filter({ hasText: name });
    await expect(row).toBeVisible();
    await row.locator("summary").click();
    await expect(row).toContainText("Agreed rate");
    await expect(row).not.toContainText("Pickup point");
    await expect(row).not.toContainText("phone");
  } finally {
    await lender.context.close();
    await borrower.context.close();
    await admin.context.close();
  }
});
