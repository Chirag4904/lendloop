/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");
const identity = (subject: string) => ({
  subject,
  tokenIdentifier: `test|${subject}`,
});
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-09T06:00:00Z"));
});
afterEach(() => vi.useRealTimers());
async function setup() {
  const t = convexTest(schema, modules);
  const societyId = await t.run((ctx) =>
    ctx.db.insert("societies", {
      name: "Home",
      city: "Kolkata",
      locality: "Central",
      latitude: 22.57,
      longitude: 88.36,
      status: "active",
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  const admin = t.withIdentity(identity("admin"));
  const owner = t.withIdentity(identity("owner"));
  const borrower = t.withIdentity(identity("borrower"));
  const stranger = t.withIdentity(identity("stranger"));
  for (const [name, actor] of [
    ["admin", admin],
    ["owner", owner],
    ["borrower", borrower],
    ["stranger", stranger],
  ] as const) {
    await actor.mutation(api.users.ensureCurrent, { displayName: name });
    await actor.mutation(api.users.selectSociety, { societyId });
  }
  const adminId = (await admin.query(api.users.me))!._id;
  await t.run((ctx) => ctx.db.patch(adminId, { role: "admin" }));
  const toolId = await owner.mutation(api.tools.create, {
    name: "Drill",
    category: "Power Tools",
    condition: "good",
    description: "Working drill",
    dailyAmount: 12000,
  });
  await owner.mutation(api.tools.setStatus, { toolId, status: "active" });
  return { t, admin, owner, borrower, stranger, toolId, societyId };
}
const paginationOpts = { numItems: 20, cursor: null };

test("admin queries and trust changes enforce the Clerk-derived role", async () => {
  const { t, admin, owner, borrower } = await setup();
  await expect(t.query(api.admin.overview, {})).rejects.toThrow(
    "Authentication",
  );
  await expect(
    owner.query(api.admin.users, { paginationOpts }),
  ).rejects.toThrow("Admin access");
  await expect(
    owner.query(api.admin.loans, { paginationOpts }),
  ).rejects.toThrow("Admin access");
  await expect(
    owner.query(api.admin.auditHistory, { paginationOpts }),
  ).rejects.toThrow("Admin access");
  const borrowerId = (await borrower.query(api.users.me))!._id;
  await expect(
    owner.mutation(api.admin.setTrust, {
      userId: borrowerId,
      badge: "trustedLender",
      value: true,
    }),
  ).rejects.toThrow("Admin access");
  await admin.mutation(api.admin.setTrust, {
    userId: borrowerId,
    badge: "trustedLender",
    value: true,
  });
  await admin.mutation(api.admin.setTrust, {
    userId: borrowerId,
    badge: "trustedBorrower",
    value: true,
  });
  expect(await borrower.query(api.users.me)).toMatchObject({
    trustedLender: true,
    trustedBorrower: true,
    role: "user",
  });
  await admin.mutation(api.admin.setTrust, {
    userId: borrowerId,
    badge: "trustedLender",
    value: false,
  });
  expect(await borrower.query(api.users.me)).toMatchObject({
    trustedLender: false,
    trustedBorrower: true,
  });
  await admin.mutation(api.admin.setTrust, {
    userId: borrowerId,
    badge: "trustedBorrower",
    value: false,
  });
  expect(await borrower.query(api.users.me)).toMatchObject({
    trustedLender: false,
    trustedBorrower: false,
  });
  await expect(
    borrower.mutation(api.users.updateProfile, {
      displayName: "New",
      role: "admin",
    } as never),
  ).rejects.toThrow();
  expect((await borrower.query(api.users.me))?.role).toBe("user");
  expect(
    (await admin.query(api.admin.auditHistory, { paginationOpts })).page,
  ).toHaveLength(4);
});

test("only admins can list stored email addresses", async () => {
  const { admin, owner } = await setup();
  await owner.mutation(api.users.ensureCurrent, { displayName: "owner" });
  await expect(
    owner.query(api.admin.users, { paginationOpts }),
  ).rejects.toThrow("Admin access");
  const page = await admin.query(api.admin.users, { paginationOpts });
  expect(
    page.page.find((user: { name: string }) => user.name === "owner"),
  ).toHaveProperty("email", null);
});

test("only deployment operators can provision the first admin", async () => {
  const t = convexTest(schema, modules);
  const user = t.withIdentity(identity("first"));
  await user.mutation(api.users.ensureCurrent, { displayName: "First" });
  expect((await user.query(api.users.me))?.role).toBe("user");
  await t.mutation(internal.admin.provisionInitial, { clerkUserId: "first" });
  expect((await user.query(api.users.me))?.role).toBe("admin");
  await expect(
    t.mutation(internal.admin.provisionInitial, { clerkUserId: "second" }),
  ).rejects.toThrow("already exists");
});

test("operator transfer preserves accounts and changes the only admin atomically", async () => {
  const { t, admin, owner } = await setup();
  await expect(
    t.mutation(internal.admin.transferAdmin, {
      currentClerkUserId: "admin",
      nextClerkUserId: "missing",
    }),
  ).rejects.toThrow("user profile");
  expect(await admin.query(api.admin.access, {})).toBe(true);
  await t.mutation(internal.admin.transferAdmin, {
    currentClerkUserId: "admin",
    nextClerkUserId: "owner",
  });
  expect(await admin.query(api.admin.access, {})).toBe(false);
  expect(await owner.query(api.admin.access, {})).toBe(true);
  expect((await admin.query(api.users.me))?.role).toBe("user");
  const audit = await owner.query(api.admin.auditHistory, { paginationOpts });
  expect(
    audit.page.some(
      (entry: { action: string }) => entry.action === "admin.transferred",
    ),
  ).toBe(true);
  await expect(
    t.mutation(internal.admin.transferAdmin, {
      currentClerkUserId: "admin",
      nextClerkUserId: "owner",
    }),
  ).rejects.toThrow("Current admin");
});

test("admin sees every loan without handover data; strangers do not", async () => {
  const { admin, owner, borrower, stranger, toolId } = await setup();
  const requestId = await borrower.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-13",
  });
  await owner.mutation(api.requests.approve, { requestId });
  const loanId = (await borrower.query(api.requests.mine))[0].loanId!;
  await borrower.mutation(api.loans.saveHandover, {
    loanId,
    phone: "9999999999",
    pickupPoint: "Private pickup",
    instructions: "Private code",
  });
  const page = await admin.query(api.admin.loans, { paginationOpts });
  expect(page.page).toHaveLength(1);
  expect(page.page[0]).toMatchObject({
    toolName: "Drill",
    borrower: "borrower",
    totalMinor: 24000,
    status: "reserved",
  });
  expect(JSON.stringify(page)).not.toContain("9999999999");
  expect(JSON.stringify(page)).not.toContain("Private pickup");
  expect(await stranger.query(api.loans.detail, { loanId })).toBeNull();
});

test("manual badges appear in listing and incoming request projections", async () => {
  const { admin, owner, borrower, toolId } = await setup();
  const ownerId = (await owner.query(api.users.me))!._id;
  const borrowerId = (await borrower.query(api.users.me))!._id;
  await admin.mutation(api.admin.setTrust, {
    userId: ownerId,
    badge: "trustedLender",
    value: true,
  });
  await admin.mutation(api.admin.setTrust, {
    userId: borrowerId,
    badge: "trustedBorrower",
    value: true,
  });
  const listings = await borrower.query(api.tools.explore, {
    scope: "society",
    text: "Drill",
    price: "all",
    sort: "nearest",
  });
  expect(listings[0]).toMatchObject({ id: toolId, trustedLender: true });
  await borrower.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-13",
  });
  expect((await owner.query(api.requests.incoming, {}))[0].trusted).toBe(true);
  await admin.mutation(api.admin.setTrust, {
    userId: borrowerId,
    badge: "trustedBorrower",
    value: false,
  });
  expect((await owner.query(api.requests.incoming, {}))[0].trusted).toBe(false);
});

test("listing removal is admin only, leaves historical loans, and hides discovery", async () => {
  const { t, admin, owner, borrower, toolId } = await setup();
  const requestId = await borrower.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-13",
  });
  await owner.mutation(api.requests.approve, { requestId });
  await expect(
    owner.mutation(api.admin.removeListing, { toolId }),
  ).rejects.toThrow("Admin access");
  await admin.mutation(api.admin.removeListing, { toolId });
  expect(await t.run((ctx) => ctx.db.get(toolId))).toMatchObject({
    active: false,
    archived: true,
  });
  expect(await borrower.query(api.tools.publicList, {})).toEqual([]);
  expect(await t.run((ctx) => ctx.db.query("loans").take(10))).toHaveLength(1);
  expect(
    (await admin.query(api.admin.auditHistory, { paginationOpts })).page[0]
      .action,
  ).toBe("listing.removed");
});

test("society approval is atomic, deduplicated and cannot be done by a user", async () => {
  const { t, admin, owner } = await setup();
  const suggestionId = await owner.mutation(api.suggestions.create, {
    name: "New House",
    city: "Kolkata",
    locality: "North",
  });
  const details = {
    name: "New House",
    city: "Kolkata",
    locality: "North",
    latitude: 22.6,
    longitude: 88.4,
  };
  await expect(
    owner.mutation(api.admin.moderateSuggestion, {
      suggestionId,
      decision: "approve",
      details,
    }),
  ).rejects.toThrow("Admin access");
  await expect(
    owner.mutation(api.admin.saveSociety, { ...details, status: "active" }),
  ).rejects.toThrow("Admin access");
  await admin.mutation(api.admin.moderateSuggestion, {
    suggestionId,
    decision: "approve",
    details,
  });
  await expect(
    admin.mutation(api.admin.moderateSuggestion, {
      suggestionId,
      decision: "approve",
      details,
    }),
  ).rejects.toThrow("already reviewed");
  await expect(
    admin.mutation(api.admin.saveSociety, {
      ...details,
      name: " new   HOUSE ",
      status: "active",
    }),
  ).rejects.toThrow("already exists");
  const societies = await t.run((ctx) => ctx.db.query("societies").take(10));
  expect(societies).toHaveLength(2);
  expect((await owner.query(api.suggestions.mine))[0].status).toBe("approved");
  const activeId = societies.find((s) => s.name === "New House")!._id;
  await admin.mutation(api.admin.saveSociety, {
    societyId: activeId,
    ...details,
    status: "inactive",
  });
  await expect(
    owner.mutation(api.users.selectSociety, { societyId: activeId }),
  ).rejects.toThrow("unavailable");
  const second = await owner.mutation(api.suggestions.create, {
    name: "Rejected Place",
  });
  await admin.mutation(api.admin.moderateSuggestion, {
    suggestionId: second,
    decision: "reject",
  });
  expect((await owner.query(api.suggestions.mine))[0].status).toBe("rejected");
});

test("automation failures are visible only to admins and filter by real status", async () => {
  const { t, admin, owner, borrower, toolId } = await setup();
  await borrower.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-13",
  });
  const event = (
    await t.run((ctx) => ctx.db.query("automationEvents").take(1))
  )[0];
  await t.run((ctx) =>
    ctx.db.patch(event._id, {
      status: "failed",
      lastErrorCode: "delivery_failed",
    }),
  );
  await expect(
    owner.query(api.admin.automation, { paginationOpts, status: "failed" }),
  ).rejects.toThrow("Admin access");
  const failed = await admin.query(api.admin.automation, {
    paginationOpts,
    status: "failed",
  });
  expect(failed.page).toMatchObject([
    { status: "failed", error: "delivery_failed" },
  ]);
  expect(
    (
      await admin.query(api.admin.automation, {
        paginationOpts,
        status: "pending",
      })
    ).page,
  ).toHaveLength(0);
});
