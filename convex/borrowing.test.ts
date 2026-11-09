/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { days, overlaps, today } from "./borrowing";

const modules = import.meta.glob("./**/*.ts");
const identity = (subject: string) => ({
  subject,
  tokenIdentifier: `test|${subject}`,
});
const toolFields = {
  name: "Drill",
  category: "Power Tools" as const,
  condition: "good" as const,
  description: "Two batteries",
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-09T06:00:00Z"));
});
afterEach(() => vi.useRealTimers());

async function setup(paid = true) {
  const t = convexTest(schema, modules);
  const societyId = await t.run((ctx) =>
    ctx.db.insert("societies", {
      name: "Home",
      city: "Mumbai",
      locality: "East",
      latitude: 19,
      longitude: 72,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  const [alice, bob, charlie] = ["alice", "bob", "charlie"].map((name) =>
    t.withIdentity(identity(name)),
  );
  for (const [name, actor] of [
    ["alice", alice],
    ["bob", bob],
    ["charlie", charlie],
  ] as const) {
    await actor.mutation(api.users.ensureCurrent, { displayName: name });
    await actor.mutation(api.users.selectSociety, { societyId });
  }
  const toolId = await alice.mutation(api.tools.create, {
    ...toolFields,
    dailyAmount: paid ? 12550 : undefined,
  });
  await alice.mutation(api.tools.setStatus, { toolId, status: "active" });
  return { t, alice, bob, charlie, toolId };
}

test("Kolkata dates are inclusive, strict, and limited to thirty days", () => {
  expect(today(Date.parse("2026-11-08T20:00:00Z"))).toBe("2026-11-09");
  expect(days("2026-11-12", "2026-11-14")).toBe(3);
  expect(
    overlaps(
      { startDate: "2026-11-12", endDate: "2026-11-14" },
      { startDate: "2026-11-12", endDate: "2026-11-14" },
    ),
  ).toBe(true);
  expect(
    overlaps(
      { startDate: "2026-11-12", endDate: "2026-11-18" },
      { startDate: "2026-11-14", endDate: "2026-11-15" },
    ),
  ).toBe(true);
  expect(
    overlaps(
      { startDate: "2026-11-12", endDate: "2026-11-14" },
      { startDate: "2026-11-14", endDate: "2026-11-16" },
    ),
  ).toBe(true);
  expect(
    overlaps(
      { startDate: "2026-11-12", endDate: "2026-11-14" },
      { startDate: "2026-11-15", endDate: "2026-11-16" },
    ),
  ).toBe(false);
  for (const [start, end] of [
    ["2026-11-08", "2026-11-10"],
    ["2026-11-13", "2026-11-12"],
    ["2026-02-30", "2026-03-01"],
    ["2026-11-09", "2026-12-09"],
  ])
    expect(() => days(start, end)).toThrow();
});

test("creation enforces identity, listing state, duplicate prevention and snapshotted totals", async () => {
  const { t, alice, bob, toolId } = await setup();
  const args = { toolId, startDate: "2026-11-12", endDate: "2026-11-14" };
  await expect(t.mutation(api.requests.create, args)).rejects.toThrow(
    "Authentication",
  );
  await expect(alice.mutation(api.requests.create, args)).rejects.toThrow(
    "own item",
  );
  await expect(
    bob.mutation(api.requests.create, { ...args, startDate: "2026-11-08" }),
  ).rejects.toThrow();
  await expect(
    bob.mutation(api.requests.create, { ...args, endDate: "2026-11-11" }),
  ).rejects.toThrow();
  const id = await bob.mutation(api.requests.create, args);
  expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
    status: "pending",
    days: 3,
    rateMinor: 12550,
    totalMinor: 37650,
  });
  await expect(bob.mutation(api.requests.create, args)).rejects.toThrow(
    "already have",
  );
  await alice.mutation(api.tools.setStatus, { toolId, status: "unlisted" });
  await expect(
    bob.mutation(api.requests.create, { ...args, endDate: "2026-11-15" }),
  ).rejects.toThrow("Listing unavailable");
  await alice.mutation(api.tools.setStatus, { toolId, status: "archived" });
  await expect(bob.mutation(api.requests.create, args)).rejects.toThrow(
    "Listing unavailable",
  );
});

test("free terms and pending cancellation do not create a loan", async () => {
  const { t, bob, toolId } = await setup(false);
  const id = await bob.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-12",
  });
  expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
    days: 1,
    rateMinor: 0,
    totalMinor: 0,
  });
  await expect(
    t
      .withIdentity(identity("charlie"))
      .mutation(api.requests.cancel, { requestId: id }),
  ).rejects.toThrow("unavailable");
  await bob.mutation(api.requests.cancel, { requestId: id });
  expect(await t.run((ctx) => ctx.db.query("loans").collect())).toHaveLength(0);
});

test("lender only approves or declines pending requests; retry is idempotent", async () => {
  const { t, alice, bob, charlie, toolId } = await setup();
  const requestId = await bob.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-14",
  });
  await expect(
    bob.mutation(api.requests.approve, { requestId }),
  ).rejects.toThrow("unavailable");
  await expect(
    charlie.mutation(api.requests.decline, { requestId }),
  ).rejects.toThrow("unavailable");
  const loanId = await alice.mutation(api.requests.approve, { requestId });
  expect(await alice.mutation(api.requests.approve, { requestId })).toBe(
    loanId,
  );
  expect(await t.run((ctx) => ctx.db.query("loans").collect())).toHaveLength(1);
  const declinedId = await charlie.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-17",
    endDate: "2026-11-18",
  });
  await alice.mutation(api.requests.decline, { requestId: declinedId });
  await expect(
    alice.mutation(api.requests.approve, { requestId: declinedId }),
  ).rejects.toThrow("pending");
  const cancelledId = await bob.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-19",
    endDate: "2026-11-20",
  });
  await bob.mutation(api.requests.cancel, { requestId: cancelledId });
  await expect(
    alice.mutation(api.requests.approve, { requestId: cancelledId }),
  ).rejects.toThrow("pending");
});

test("overlapping approvals cannot double book; adjacent and returned dates can", async () => {
  const { t, alice, bob, charlie, toolId } = await setup();
  const a = await bob.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-14",
  });
  const b = await charlie.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-13",
    endDate: "2026-11-15",
  });
  const outcomes = await Promise.allSettled([
    alice.mutation(api.requests.approve, { requestId: a }),
    alice.mutation(api.requests.approve, { requestId: b }),
  ]);
  expect(outcomes.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  expect(await t.run((ctx) => ctx.db.query("loans").collect())).toHaveLength(1);
  const approved = outcomes.find(
    (x) => x.status === "fulfilled",
  ) as PromiseFulfilledResult<Awaited<ReturnType<typeof alice.mutation>>>;
  expect(
    (await alice.query(api.requests.incoming, {})).find(
      (r) => r.id === (outcomes[0].status === "rejected" ? a : b),
    )?.conflict,
  ).toBe(true);
  const adjacent = await charlie.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-16",
    endDate: "2026-11-17",
  });
  await alice.mutation(api.requests.approve, { requestId: adjacent });
  await alice.mutation(api.loans.confirmReturn, { loanId: approved.value });
  await alice.mutation(api.requests.approve, {
    requestId: outcomes[0].status === "rejected" ? a : b,
  });
  expect(await t.run((ctx) => ctx.db.query("loans").collect())).toHaveLength(3);
});

test("only participants see private handover; borrower reports, lender confirms, history survives archive", async () => {
  const { t, alice, bob, charlie, toolId } = await setup();
  const requestId = await bob.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-14",
  });
  const pending = (await alice.query(api.requests.incoming, {}))[0];
  expect(pending).not.toHaveProperty("phone");
  expect(pending).not.toHaveProperty("borrowerId");
  const loanId = await alice.mutation(api.requests.approve, { requestId });
  await alice.mutation(api.loans.saveHandover, {
    loanId,
    phone: "+911234567890",
    pickupPoint: "Lobby",
    instructions: "Call on arrival",
  });
  expect(
    (await bob.query(api.loans.detail, { loanId }))?.details[0].phone,
  ).toBe("+911234567890");
  expect(await charlie.query(api.loans.detail, { loanId })).toBeNull();
  await expect(
    charlie.mutation(api.loans.saveHandover, {
      loanId,
      phone: "1234567890",
      pickupPoint: "",
      instructions: "",
    }),
  ).rejects.toThrow("unavailable");
  await expect(
    bob.mutation(api.loans.confirmReturn, { loanId }),
  ).rejects.toThrow("unavailable");
  vi.setSystemTime(new Date("2026-11-15T06:00:00Z"));
  expect((await bob.query(api.loans.detail, { loanId }))?.overdue).toBe(true);
  await bob.mutation(api.loans.reportReturn, { loanId });
  expect((await bob.query(api.loans.detail, { loanId }))?.status).toBe(
    "return_pending",
  );
  await alice.mutation(api.loans.confirmReturn, { loanId });
  await alice.mutation(api.tools.setStatus, { toolId, status: "archived" });
  expect((await bob.query(api.loans.detail, { loanId }))?.status).toBe(
    "returned",
  );
  expect((await bob.query(api.loans.detail, { loanId }))?.overdue).toBe(false);
  await alice.mutation(api.loans.saveHandover, {
    loanId,
    phone: "",
    pickupPoint: "",
    instructions: "",
  });
  expect((await bob.query(api.loans.detail, { loanId }))?.details).toHaveLength(
    0,
  );
  expect(await t.run((ctx) => ctx.db.get(loanId))).toMatchObject({
    status: "returned",
    totalMinor: 37650,
  });
});

test("completed loans allow a fresh request for the same future dates", async () => {
  const { alice, bob, toolId } = await setup();
  const dates = { toolId, startDate: "2026-11-12", endDate: "2026-11-14" };
  const first = await bob.mutation(api.requests.create, dates);
  const loanId = await alice.mutation(api.requests.approve, {
    requestId: first,
  });
  await expect(bob.mutation(api.requests.create, dates)).rejects.toThrow(
    "already have",
  );
  await alice.mutation(api.loans.confirmReturn, { loanId });
  expect(await bob.mutation(api.requests.create, dates)).not.toBe(first);
});
