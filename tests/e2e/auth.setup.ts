import { clerkSetup } from "@clerk/testing/playwright";
import { test } from "@playwright/test";

test("configure Clerk testing token", async () => {
  await clerkSetup();
});
