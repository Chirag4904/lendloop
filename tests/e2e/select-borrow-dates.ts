import type { Page } from "@playwright/test";

export async function selectBorrowDates(
  page: Page,
  start: string,
  end: string,
) {
  await page.getByText("Choose dates on a calendar").click();
  for (const date of [start, end]) {
    const month = new Intl.DateTimeFormat("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
    while (
      (await page.locator(".calendar-heading strong").textContent()) !== month
    ) {
      await page.getByRole("button", { name: "Next month" }).click();
    }
    const label = new Intl.DateTimeFormat("en-IN", {
      dateStyle: "full",
      timeZone: "UTC",
    }).format(new Date(`${date}T00:00:00Z`));
    await page.getByRole("button", { name: label, exact: true }).click();
  }
}
