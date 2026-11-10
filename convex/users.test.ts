/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

test("stores verified Clerk email once and rejects duplicate addresses", async () => {
  const t = convexTest(schema, modules);
  const first = t.withIdentity({
    subject: "first",
    tokenIdentifier: "test|first",
    email: "One@Example.com",
    emailVerified: true,
  });
  await first.mutation(api.users.ensureCurrent, { displayName: "First" });
  expect((await first.query(api.users.me))?.email).toBe("one@example.com");
  const spoofed = t.withIdentity({
    subject: "other",
    tokenIdentifier: "test|other",
    email: "one@example.com",
    emailVerified: true,
  });
  await expect(
    spoofed.mutation(api.users.ensureCurrent, { displayName: "Other" }),
  ).rejects.toThrow("Email already belongs");
  const unverified = t.withIdentity({
    subject: "unverified",
    tokenIdentifier: "test|unverified",
    email: "other@example.com",
    emailVerified: false,
  });
  await unverified.mutation(api.users.ensureCurrent, {
    displayName: "Unverified",
  });
  expect((await unverified.query(api.users.me))?.email).toBeUndefined();
  const verified = t.withIdentity({
    subject: "unverified",
    tokenIdentifier: "test|unverified",
    email: "other@example.com",
    emailVerified: true,
  });
  await verified.mutation(api.users.ensureCurrent, {
    displayName: "Unverified",
  });
  expect((await verified.query(api.users.me))?.email).toBe("other@example.com");
  await t.mutation(internal.users.backfillEmail, {
    clerkUserId: "first",
    email: "new@example.com",
  });
  expect((await first.query(api.users.me))?.email).toBe("one@example.com");
});
