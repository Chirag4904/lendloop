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

test("offers require an active paid listing, another borrower, and valid integer paise", async () => {
  const { t, alice, bob, toolId } = await setup();
  const args = {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-14",
    offerMinor: 6000,
  };
  await expect(t.mutation(api.requests.create, args)).rejects.toThrow(
    "Authentication",
  );
  await expect(alice.mutation(api.requests.create, args)).rejects.toThrow(
    "own item",
  );
  for (const offerMinor of [
    0,
    -1,
    12550,
    20000,
    1.2,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER,
  ])
    await expect(
      bob.mutation(api.requests.create, { ...args, offerMinor }),
    ).rejects.toThrow();
  const free = await setup(false);
  await expect(
    free.bob.mutation(api.requests.create, { ...args, toolId: free.toolId }),
  ).rejects.toThrow("Offer");
  const id = await bob.mutation(api.requests.create, args);
  expect(await t.run((ctx) => ctx.db.get(id))).toMatchObject({
    status: "pending",
    rateMinor: 12550,
    totalMinor: 37650,
    listedRateMinor: 12550,
    borrowerOfferMinor: 6000,
  });
  await expect(bob.mutation(api.requests.create, args)).rejects.toThrow(
    "already",
  );
  expect((await bob.query(api.requests.mine, {}))[0].borrowerOfferMinor).toBe(
    6000,
  );
});

test("lender accepts one offer at its price and cannot change it after confirmation", async () => {
  const { t, alice, bob, charlie, toolId } = await setup();
  const requestId = await bob.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-14",
    offerMinor: 6000,
  });
  await expect(
    bob.mutation(api.requests.respondToOffer, {
      requestId,
      decision: "accepted_offer",
    }),
  ).rejects.toThrow("unavailable");
  await expect(
    charlie.mutation(api.requests.respondToOffer, {
      requestId,
      decision: "accepted_offer",
    }),
  ).rejects.toThrow("unavailable");
  await expect(
    alice.mutation(api.requests.approve, { requestId }),
  ).rejects.toThrow("price decision");
  const loanId = await alice.mutation(api.requests.respondToOffer, {
    requestId,
    decision: "accepted_offer",
  });
  expect(await t.run((ctx) => ctx.db.get(loanId!))).toMatchObject({
    rateMinor: 6000,
    totalMinor: 18000,
    requestId,
  });
  expect(await t.run((ctx) => ctx.db.get(toolId))).toMatchObject({
    pricing: { dailyAmount: 12550, currency: "INR" },
  });
  await t.run((ctx) =>
    ctx.db.patch(toolId, { pricing: { dailyAmount: 15000, currency: "INR" } }),
  );
  expect(await t.run((ctx) => ctx.db.get(loanId!))).toMatchObject({
    rateMinor: 6000,
    totalMinor: 18000,
  });
  expect(await t.query(api.tools.publicList, {})).toEqual([
    { name: "Drill", category: "Power Tools" },
  ]);
  expect(await charlie.query(api.requests.mine, {})).toEqual([]);
  expect(await charlie.query(api.requests.incoming, {})).toEqual([]);
  await expect(
    alice.mutation(api.requests.respondToOffer, {
      requestId,
      decision: "countered",
      counterMinor: 8000,
    }),
  ).rejects.toThrow("pending");
  await expect(
    bob.mutation(api.requests.respondToFinalPrice, { requestId, accept: true }),
  ).rejects.toThrow("no longer");
  expect(await t.run((ctx) => ctx.db.query("loans").collect())).toHaveLength(1);
});

test("one counteroffer is final; borrower can accept, walk away, or accept listed price", async () => {
  const { t, alice, bob, charlie, toolId } = await setup();
  const make = (startDate: string, endDate: string, who = bob) =>
    who.mutation(api.requests.create, {
      toolId,
      startDate,
      endDate,
      offerMinor: 6000,
    });
  const requestId = await make("2026-11-12", "2026-11-14");
  for (const counterMinor of [6000, 12550, 0, 1.5, Number.NaN])
    await expect(
      alice.mutation(api.requests.respondToOffer, {
        requestId,
        decision: "countered",
        counterMinor,
      }),
    ).rejects.toThrow();
  await alice.mutation(api.requests.respondToOffer, {
    requestId,
    decision: "countered",
    counterMinor: 8000,
  });
  await expect(
    alice.mutation(api.requests.respondToOffer, {
      requestId,
      decision: "countered",
      counterMinor: 9000,
    }),
  ).rejects.toThrow("pending");
  await expect(
    bob.mutation(api.requests.create, {
      toolId,
      startDate: "2026-11-12",
      endDate: "2026-11-14",
      offerMinor: 7000,
    }),
  ).rejects.toThrow("already");
  await expect(
    charlie.mutation(api.requests.respondToFinalPrice, {
      requestId,
      accept: true,
    }),
  ).rejects.toThrow("unavailable");
  const loanId = await bob.mutation(api.requests.respondToFinalPrice, {
    requestId,
    accept: true,
  });
  expect(await t.run((ctx) => ctx.db.get(loanId!))).toMatchObject({
    rateMinor: 8000,
    totalMinor: 24000,
  });
  await expect(
    bob.mutation(api.requests.respondToFinalPrice, { requestId, accept: true }),
  ).rejects.toThrow("no longer");
  const walked = await make("2026-11-16", "2026-11-17");
  await alice.mutation(api.requests.respondToOffer, {
    requestId: walked,
    decision: "countered",
    counterMinor: 8000,
  });
  await bob.mutation(api.requests.respondToFinalPrice, {
    requestId: walked,
    accept: false,
  });
  await expect(
    bob.mutation(api.requests.respondToFinalPrice, {
      requestId: walked,
      accept: true,
    }),
  ).rejects.toThrow("no longer");
  await expect(make("2026-11-16", "2026-11-17")).rejects.toThrow(
    "already made an offer",
  );
  const listed = await make("2026-11-19", "2026-11-20", charlie);
  await alice.mutation(api.requests.respondToOffer, {
    requestId: listed,
    decision: "kept_listed_price",
  });
  const listedLoan = await charlie.mutation(api.requests.respondToFinalPrice, {
    requestId: listed,
    accept: true,
  });
  expect(await t.run((ctx) => ctx.db.get(listedLoan!))).toMatchObject({
    rateMinor: 12550,
    totalMinor: 25100,
  });
  expect(await t.run((ctx) => ctx.db.query("loans").collect())).toHaveLength(2);
});

test("a one-paise price gap has no valid counteroffer", async () => {
  const { alice, bob, toolId } = await setup();
  const requestId = await bob.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-12",
    offerMinor: 12549,
  });
  await expect(
    alice.mutation(api.requests.respondToOffer, {
      requestId,
      decision: "countered",
      counterMinor: 12549,
    }),
  ).rejects.toThrow("between");
  await expect(
    alice.mutation(api.requests.respondToOffer, {
      requestId,
      decision: "countered",
      counterMinor: 12550,
    }),
  ).rejects.toThrow("between");
});

test("declines, cancellations, and overlapping final acceptances cannot create loans", async () => {
  const { t, alice, bob, charlie, toolId } = await setup();
  const args = {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-14",
    offerMinor: 6000,
  };
  const declined = await bob.mutation(api.requests.create, args);
  await alice.mutation(api.requests.decline, { requestId: declined });
  await expect(
    alice.mutation(api.requests.respondToOffer, {
      requestId: declined,
      decision: "accepted_offer",
    }),
  ).rejects.toThrow("pending");
  const cancelled = await bob.mutation(api.requests.create, {
    ...args,
    startDate: "2026-11-16",
    endDate: "2026-11-17",
  });
  await bob.mutation(api.requests.cancel, { requestId: cancelled });
  await expect(
    alice.mutation(api.requests.respondToOffer, {
      requestId: cancelled,
      decision: "accepted_offer",
    }),
  ).rejects.toThrow("pending");
  const a = await bob.mutation(api.requests.create, {
    ...args,
    startDate: "2026-11-18",
    endDate: "2026-11-20",
  });
  const b = await charlie.mutation(api.requests.create, {
    ...args,
    startDate: "2026-11-19",
    endDate: "2026-11-21",
  });
  await alice.mutation(api.requests.respondToOffer, {
    requestId: a,
    decision: "kept_listed_price",
  });
  await alice.mutation(api.requests.respondToOffer, {
    requestId: b,
    decision: "kept_listed_price",
  });
  const results = await Promise.allSettled([
    bob.mutation(api.requests.respondToFinalPrice, {
      requestId: a,
      accept: true,
    }),
    charlie.mutation(api.requests.respondToFinalPrice, {
      requestId: b,
      accept: true,
    }),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  expect(await t.run((ctx) => ctx.db.query("loans").collect())).toHaveLength(1);
});
