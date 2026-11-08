import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

test.skip(
  !process.env.E2E_CLERK_USER_EMAIL ||
    !process.env.CLERK_SECRET_KEY ||
    !process.env.NEXT_PUBLIC_CONVEX_URL,
  "Requires a Clerk and Convex development setup",
);

test("Clerk token validates in Convex", async ({ page }) => {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: process.env.E2E_CLERK_USER_EMAIL! });
  const token = await page.evaluate(async () => {
    const clerkClient = (
      window as Window & {
        Clerk?: { session?: { getToken: () => Promise<string | null> } };
      }
    ).Clerk;
    return (await clerkClient?.session?.getToken()) ?? null;
  });
  expect(token).toBeTruthy();
  const claims = JSON.parse(
    Buffer.from(token!.split(".")[1], "base64url").toString("utf8"),
  );
  expect(claims.aud).toBe("convex");
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  convex.setAuth(token!);
  const profile = await convex.query(api.users.me, {});
  expect(profile === null || typeof profile.clerkUserId === "string").toBe(
    true,
  );
});
