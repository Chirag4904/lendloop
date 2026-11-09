import { selectBorrowDates } from "./select-borrow-dates";
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
    page.getByRole("heading", { name: "Your neighborhood shelf." }),
  ).toBeVisible();
  return { context, page };
}

async function listDrill(page: Page, dailyRate?: string) {
  const name = `Borrowing drill ${Date.now()}`;
  await page.goto("/dashboard/listings/new");
  await page.getByLabel("Item name").fill(name);
  await page
    .getByLabel("Description")
    .fill("A cordless drill for small repairs.");
  await page.getByLabel("Category").selectOption("Power Tools");
  if (dailyRate) {
    await page.getByLabel("Paid rental").check();
    await page.getByLabel("Daily rate in INR").fill(dailyRate);
  }
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

async function sendOffer(page: Page, href: string) {
  const { start, end } = dates();
  await page.goto(href);
  await page.getByRole("button", { name: "Make an Offer" }).click();
  await page.getByLabel("Your daily offer in rupees").fill("600");
  await selectBorrowDates(page, start, end);
  for (const width of [360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Send Offer" }),
    ).toBeEnabled();
  }
  await page.getByRole("button", { name: "Send Offer" }).click();
  await expect(page).toHaveURL(/\/dashboard\/requests$/);
}

for (const response of [
  "accept",
  "counter",
  "listed",
  "walk",
  "decline",
] as const) {
  test(`paid offer: lender ${response}`, async ({ browser }) => {
    const lender = await asUser(browser, process.env.E2E_CLERK_USER_EMAIL!);
    const borrower = await asUser(
      browser,
      process.env.E2E_CLERK_BORROWER_EMAIL!,
    );
    try {
      const { name, href } = await listDrill(lender.page, "1000");
      await sendOffer(borrower.page, href);
      await lender.page.goto("/dashboard/incoming");
      const incoming = lender.page
        .getByRole("article")
        .filter({ has: lender.page.getByRole("heading", { name }) });
      await expect(incoming.getByText("Borrower offered")).toBeVisible();
      if (response === "accept")
        await incoming.getByRole("button", { name: "Accept Offer" }).click();
      else if (response === "decline") {
        lender.page.once("dialog", (dialog) => dialog.accept());
        await incoming.getByRole("button", { name: "Decline Request" }).click();
      } else if (response === "listed")
        await incoming
          .getByRole("button", { name: "Keep Listed Price" })
          .click();
      else {
        await incoming
          .getByRole("button", { name: "Suggest Another Price" })
          .click();
        await lender.page
          .getByLabel("Your final daily price in rupees")
          .fill("800");
        await lender.page
          .getByRole("button", { name: "Send final price" })
          .click();
      }
      const own = borrower.page
        .getByRole("article")
        .filter({ has: borrower.page.getByRole("heading", { name }) });
      if (response === "counter" || response === "listed")
        await own
          .getByRole("button", {
            name:
              response === "counter"
                ? /Accept.*800.*day/
                : /Continue at.*1,000.*day/,
          })
          .click();
      if (response === "walk")
        await own.getByRole("button", { name: "Not Right Now" }).click();
      if (response === "walk" || response === "decline") {
        await expect(own.getByRole("link", { name: "View loan" })).toHaveCount(
          0,
        );
      } else {
        await expect(
          own.getByRole("link", { name: "View loan" }),
        ).toBeVisible();
        await own.getByRole("link", { name: "View loan" }).click();
        await expect(borrower.page.locator(".loan-hero")).toContainText(
          `${response === "accept" ? "₹600.00" : response === "counter" ? "₹800.00" : "₹1,000.00"} / day`,
        );
        await borrower.page.goto(href);
        await expect(borrower.page.getByText("₹1,000")).toBeVisible();
      }
    } finally {
      await lender.context.close();
      await borrower.context.close();
    }
  });
}

test("overlapping final acceptances explain the conflict", async ({
  browser,
}) => {
  test.skip(
    !process.env.E2E_CLERK_THIRD_EMAIL,
    "Requires a third isolated Clerk test account",
  );
  const lender = await asUser(browser, process.env.E2E_CLERK_USER_EMAIL!);
  const first = await asUser(browser, process.env.E2E_CLERK_BORROWER_EMAIL!);
  const second = await asUser(browser, process.env.E2E_CLERK_THIRD_EMAIL!);
  try {
    const { name, href } = await listDrill(lender.page, "1000");
    await sendOffer(first.page, href);
    await sendOffer(second.page, href);
    await lender.page.goto("/dashboard/incoming");
    const cards = lender.page
      .getByRole("article")
      .filter({ has: lender.page.getByRole("heading", { name }) });
    await expect(cards).toHaveCount(2);
    for (const card of await cards.all())
      await card.getByRole("button", { name: "Keep Listed Price" }).click();
    const own = (page: Page) =>
      page
        .getByRole("article")
        .filter({ has: page.getByRole("heading", { name }) });
    await own(first.page)
      .getByRole("button", { name: /Continue at/ })
      .click();
    await expect(
      own(first.page).getByRole("link", { name: "View loan" }),
    ).toBeVisible();
    await own(second.page)
      .getByRole("button", { name: /Continue at/ })
      .click();
    await expect(second.page.getByRole("alert")).toContainText(
      "already reserved",
    );
    await expect(
      own(second.page).getByRole("link", { name: "View loan" }),
    ).toHaveCount(0);
  } finally {
    await lender.context.close();
    await first.context.close();
    await second.context.close();
  }
});

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
  await selectBorrowDates(page, start, end);
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

test("notification center updates live and loan automation fits mobile widths", async ({
  browser,
}) => {
  const lender = await asUser(browser, process.env.E2E_CLERK_USER_EMAIL!);
  const borrower = await asUser(browser, process.env.E2E_CLERK_BORROWER_EMAIL!);
  try {
    const { name, href } = await listDrill(lender.page);
    await lender.page.goto("/dashboard/notifications");
    await expect(
      lender.page.getByRole("heading", { name: "The latest, from nearby." }),
    ).toBeVisible();
    const before = await lender.page.locator(".automation-list li").count();
    await request(borrower.page, href);
    await expect
      .poll(() => lender.page.locator(".automation-list li").count())
      .toBeGreaterThan(before);
    for (const width of [360, 390]) {
      await lender.page.setViewportSize({ width, height: 800 });
      expect(
        await lender.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await lender.page.goto("/dashboard/incoming");
    const card = lender.page
      .getByRole("article")
      .filter({ has: lender.page.getByRole("heading", { name }) });
    lender.page.once("dialog", (dialog) => dialog.accept());
    await card.getByRole("button", { name: "Approve Request" }).click();
    await card.getByRole("link", { name: "View loan" }).click();
    await expect(
      lender.page.getByRole("heading", { name: "Automation" }),
    ).toBeVisible();
    for (const width of [360, 390]) {
      await lender.page.setViewportSize({ width, height: 800 });
      expect(
        await lender.page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
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
