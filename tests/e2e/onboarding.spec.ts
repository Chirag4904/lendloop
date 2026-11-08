import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test.skip(
  !process.env.E2E_CLERK_USER_EMAIL ||
    !process.env.CLERK_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_CONVEX_URL ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_"),
  "Requires an isolated Clerk and Convex development setup",
);

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });
  await page.goto("/onboarding");
  await expect(
    page.getByRole("heading", { name: /Where do you belong/i }),
  ).toBeVisible();
});

test("suggest a society for review", async ({ page }) => {
  await page.getByText("Can’t find your society? Suggest it").click();
  await page.getByLabel("Society name *").fill("E2E Test Society");
  await page.getByRole("button", { name: "Send suggestion" }).click();
  await expect(
    page.getByText("Thanks! Your suggestion was sent for review."),
  ).toBeVisible();
});

test("search a seeded society", async ({ page }) => {
  test.skip(
    !process.env.E2E_SOCIETY_NAME,
    "Set E2E_SOCIETY_NAME after seeding the development directory",
  );
  await page
    .getByLabel("Society, locality, or city")
    .fill(process.env.E2E_SOCIETY_NAME!);
  await expect(
    page.getByRole("button", {
      name: new RegExp(process.env.E2E_SOCIETY_NAME!, "i"),
    }),
  ).toBeVisible();
});
