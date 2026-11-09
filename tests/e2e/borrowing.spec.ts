import { clerk } from "@clerk/testing/playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { expect, test, type Browser, type Page } from "@playwright/test";

test.skip(
  !process.env.E2E_CLERK_USER_EMAIL ||
    !process.env.E2E_CLERK_BORROWER_EMAIL ||
    !process.env.CLERK_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_CONVEX_URL ||
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith("pk_test_"),
  "Requires two onboarded Clerk test users and an isolated development Convex deployment",
);

async function asUser(browser: Browser, emailAddress: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/");
  await clerk.signIn({ page, emailAddress });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Good things, close to home." }),
  ).toBeVisible();
  return { context, page };
}

async function listDrill(page: Page) {
  const name = `Borrowing drill ${Date.now()}`;
  await page.goto("/dashboard/listings/new");
  await page.getByLabel("Item name").fill(name);
  await page
    .getByLabel("Description")
    .fill("A cordless drill for small repairs.");
  await page.getByLabel("Category").selectOption("Power Tools");
  await page.getByRole("button", { name: "Preview listing" }).click();
  await page.getByRole("button", { name: "Publish listing" }).click();
  await expect(page).toHaveURL(/\/dashboard\/listings$/);
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name }) });
  const href = await card
    .getByRole("link", { name, exact: true })
    .getAttribute("href");
  expect(href).toBeTruthy();
  return { name, href: href! };
}

function dates() {
  const date = new Date(Date.now() + 7 * 86_400_000);
  const format = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  return {
    start: format(date),
    end: format(new Date(date.getTime() + 2 * 86_400_000)),
  };
}

async function request(page: Page, href: string) {
  const { start, end } = dates();
  await page.goto(href);
  await page.getByRole("button", { name: "Request to Borrow" }).click();
  await page.getByLabel("Start date").fill(start);
  await page.getByLabel("End date").fill(end);
  await expect(page.getByText("3 days · Free")).toBeVisible();
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Send request" }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page).toHaveURL(/\/dashboard\/requests$/);
}

test("borrower and lender complete a loan and share private handover details", async ({
  browser,
}) => {
  const lender = await asUser(browser, process.env.E2E_CLERK_USER_EMAIL!);
  const borrower = await asUser(browser, process.env.E2E_CLERK_BORROWER_EMAIL!);
  try {
    const { name, href } = await listDrill(lender.page);
    await request(borrower.page, href);
    await lender.page.goto("/dashboard/incoming");
    const card = lender.page
      .getByRole("article")
      .filter({ has: lender.page.getByRole("heading", { name }) });
    await expect(card.getByText("Pending")).toBeVisible();
    lender.page.once("dialog", (dialog) => dialog.accept());
    await card.getByRole("button", { name: "Approve Request" }).click();
    await expect(card.getByText("Approved")).toBeVisible();
    await borrower.page.goto("/dashboard/requests");
    const own = borrower.page
      .getByRole("article")
      .filter({ has: borrower.page.getByRole("heading", { name }) });
    await expect(own.getByText("Approved")).toBeVisible();
    await own.getByRole("link", { name: "View loan" }).click();
    await borrower.page
      .getByRole("button", { name: "Edit my details" })
      .click();
    await borrower.page
      .getByLabel("Pickup point (optional)")
      .fill("Lobby desk");
    await borrower.page.getByRole("button", { name: "Save details" }).click();
    await expect(
      borrower.page.getByText("Pickup point: Lobby desk"),
    ).toBeVisible();
    const loanUrl = borrower.page.url();
    await lender.page.goto(loanUrl);
    await expect(
      lender.page.getByText("Pickup point: Lobby desk"),
    ).toBeVisible();
    await borrower.page
      .getByRole("button", { name: "I’ve Returned the Item" })
      .click();
    await expect(
      borrower.page.getByText("Return awaiting confirmation"),
    ).toBeVisible();
    await lender.page.getByRole("button", { name: "Confirm Return" }).click();
    await expect(lender.page.getByText("Returned")).toBeVisible();
    await expect(borrower.page.getByText("Returned")).toBeVisible();
  } finally {
    await lender.context.close();
    await borrower.context.close();
  }
});

test("lender can decline a request without creating a loan", async ({
  browser,
}) => {
  const lender = await asUser(browser, process.env.E2E_CLERK_USER_EMAIL!);
  const borrower = await asUser(browser, process.env.E2E_CLERK_BORROWER_EMAIL!);
  try {
    const { name, href } = await listDrill(lender.page);
    await request(borrower.page, href);
    await lender.page.goto("/dashboard/incoming");
    const card = lender.page
      .getByRole("article")
      .filter({ has: lender.page.getByRole("heading", { name }) });
    lender.page.once("dialog", (dialog) => dialog.accept());
    await card.getByRole("button", { name: "Decline Request" }).click();
    await borrower.page.goto("/dashboard/requests");
    const own = borrower.page
      .getByRole("article")
      .filter({ has: borrower.page.getByRole("heading", { name }) });
    await expect(own.getByText("Declined")).toBeVisible();
    await expect(own.getByRole("link", { name: "View loan" })).toHaveCount(0);
  } finally {
    await lender.context.close();
    await borrower.context.close();
  }
});

test("an unrelated signed-in user cannot read or alter a private loan", async ({
  browser,
}) => {
  test.skip(
    !process.env.E2E_CLERK_THIRD_EMAIL,
    "Requires a third onboarded Clerk test user",
  );
  const lender = await asUser(browser, process.env.E2E_CLERK_USER_EMAIL!);
  const borrower = await asUser(browser, process.env.E2E_CLERK_BORROWER_EMAIL!);
  const other = await asUser(browser, process.env.E2E_CLERK_THIRD_EMAIL!);
  try {
    const { name, href } = await listDrill(lender.page);
    await request(borrower.page, href);
    await lender.page.goto("/dashboard/incoming");
    const card = lender.page
      .getByRole("article")
      .filter({ has: lender.page.getByRole("heading", { name }) });
    lender.page.once("dialog", (dialog) => dialog.accept());
    await card.getByRole("button", { name: "Approve Request" }).click();
    await card.getByRole("link", { name: "View loan" }).click();
    const url = lender.page.url();
    const loanId = url.split("/").at(-1) as Id<"loans">;
    await other.page.goto(url);
    await expect(
      other.page.getByRole("heading", { name: "Loan unavailable" }),
    ).toBeVisible();
    const token = await other.page.evaluate(async () => {
      const clerkClient = (
        window as Window & {
          Clerk?: { session?: { getToken: () => Promise<string | null> } };
        }
      ).Clerk;
      return (await clerkClient?.session?.getToken()) ?? null;
    });
    expect(token).toBeTruthy();
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    convex.setAuth(token!);
    expect(await convex.query(api.loans.detail, { loanId })).toBeNull();
    await expect(
      convex.mutation(api.loans.confirmReturn, { loanId }),
    ).rejects.toThrow("Loan unavailable");
  } finally {
    await lender.context.close();
    await borrower.context.close();
    await other.context.close();
  }
});
