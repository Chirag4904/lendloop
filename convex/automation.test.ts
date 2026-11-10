/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { hmac, verify } from "./signing";

const modules = import.meta.glob("./**/*.ts");
const actor = (t: ReturnType<typeof convexTest>, name: string) =>
  t.withIdentity({ subject: name, tokenIdentifier: `test|${name}` });

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
      locality: "A",
      latitude: 22,
      longitude: 88,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  const lender = actor(t, "lender"),
    borrower = actor(t, "borrower"),
    stranger = actor(t, "stranger");
  for (const [name, who] of [
    ["lender", lender],
    ["borrower", borrower],
    ["stranger", stranger],
  ] as const) {
    await who.mutation(api.users.ensureCurrent, { displayName: name });
    await who.mutation(api.users.selectSociety, { societyId });
  }
  const toolId = await lender.mutation(api.tools.create, {
    name: "Drill",
    category: "Power Tools",
    condition: "good",
    description: "Works",
    dailyAmount: 1000,
  });
  await lender.mutation(api.tools.setStatus, { toolId, status: "active" });
  return { t, lender, borrower, stranger, toolId };
}

test("successful transitions enqueue once; failed and repeated transitions do not", async () => {
  const { t, lender, borrower, toolId } = await setup();
  const requestId = await borrower.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-12",
  });
  await expect(
    borrower.mutation(api.requests.create, {
      toolId,
      startDate: "2026-11-12",
      endDate: "2026-11-12",
    }),
  ).rejects.toThrow();
  expect(
    (await t.run((ctx) => ctx.db.query("automationEvents").collect())).map(
      (e) => e.type,
    ),
  ).toEqual(["borrow_request.created"]);
  const loanId = await lender.mutation(api.requests.approve, { requestId });
  await lender.mutation(api.requests.approve, { requestId });
  await borrower.mutation(api.loans.reportReturn, { loanId });
  await borrower.mutation(api.loans.reportReturn, { loanId });
  await lender.mutation(api.loans.confirmReturn, { loanId });
  await lender.mutation(api.loans.confirmReturn, { loanId });
  expect(
    (await t.run((ctx) => ctx.db.query("automationEvents").collect())).map(
      (e) => e.type,
    ),
  ).toEqual([
    "borrow_request.created",
    "borrow_request.approved",
    "return.initiated",
    "return.confirmed",
  ]);
});

test("offer and counter events address the correct participant", async () => {
  const { t, lender, borrower, toolId } = await setup();
  const requestId = await borrower.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-12",
    offerMinor: 500,
  });
  await lender.mutation(api.requests.respondToOffer, {
    requestId,
    decision: "countered",
    counterMinor: 700,
  });
  await borrower.mutation(api.requests.respondToFinalPrice, {
    requestId,
    accept: true,
  });
  const events = await t.run((ctx) =>
    ctx.db.query("automationEvents").collect(),
  );
  expect(events.map((e) => e.type)).toEqual([
    "borrower.offer",
    "lender.countered",
    "borrower.final_accepted",
  ]);
  expect(events[0].recipientId).toBe(events[2].recipientId);
  expect(events[1].recipientId).not.toBe(events[0].recipientId);
  const claim = await t.mutation(internal.automation.claimEvent, {
    eventId: events[0]._id,
    lease: "one",
  });
  expect(claim).toEqual({
    type: "borrower.offer",
    recipientUserId: events[0].recipientId,
    requestId,
    toolName: "Drill",
    lease: "one",
  });
  expect(JSON.stringify(claim)).not.toMatch(/phone|pickupPoint|address|clerk/i);
});

test("only the recipient can clear a delivered update", async () => {
  const { t, lender, borrower, toolId } = await setup();
  const requestId = await borrower.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-12",
  });
  expect((await lender.query(api.automation.mine, {}))[0].unreadId).toBeNull();
  const event = await t.run((ctx) =>
    ctx.db
      .query("automationEvents")
      .withIndex("by_request", (q) => q.eq("requestId", requestId))
      .unique(),
  );
  await t.mutation(internal.automation.claimEvent, {
    eventId: event!._id,
    lease: "delivery",
  });
  await t.mutation(internal.automation.deliverEvent, {
    eventId: event!._id,
    lease: "delivery",
    message: "New borrow request",
  });

  const [row] = await lender.query(api.automation.mine, {});
  expect(row.unreadId).toBeTruthy();
  expect(await borrower.query(api.automation.mine, {})).toEqual([]);
  await borrower.mutation(api.automation.markRead, { ids: [row.unreadId!] });
  expect((await lender.query(api.automation.mine, {}))[0].unreadId).toEqual(
    row.unreadId,
  );
  await lender.mutation(api.automation.markRead, { ids: [row.unreadId!] });
  expect((await lender.query(api.automation.mine, {}))[0]).toMatchObject({
    message: "New borrow request",
    status: "delivered",
    unreadId: null,
  });
});

test("HMAC rejects missing, malformed and stale signatures", async () => {
  const secret = "a-test-secret",
    body = '{"eventId":"one"}',
    path = "/automation/events/complete",
    timestamp = String(Date.now()),
    nonce = "a0b1c2d3-1234-4567-89ab-0123456789ab";
  const signature = await hmac(secret, "POST", path, timestamp, nonce, body);
  const request = (ts: string, sig?: string) =>
    new Request(`https://example.convex.site${path}`, {
      method: "POST",
      headers: {
        "x-lendloop-timestamp": ts,
        "x-lendloop-nonce": nonce,
        ...(sig ? { "x-lendloop-signature": sig } : {}),
      },
      body,
    });
  expect(await verify(secret, request(timestamp, signature), body)).toBe(true);
  expect(await verify(secret, request(timestamp), body)).toBe(false);
  expect(await verify(secret, request(timestamp, "bad"), body)).toBe(false);
  expect(
    await verify(
      secret,
      request(String(Date.now() - 300_001), signature),
      body,
    ),
  ).toBe(false);
  expect(await verify(secret, request(timestamp, signature), body + " ")).toBe(
    false,
  );
});

test("nonce replay and reminder claims are transactional and idempotent", async () => {
  const { t, lender, borrower, stranger, toolId } = await setup();
  const requestId = await borrower.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-12",
  });
  const loanId = await lender.mutation(api.requests.approve, { requestId });
  expect(
    await t.mutation(internal.automation.useNonce, {
      nonce: "nonce-1234567890123456",
    }),
  ).toBe(true);
  expect(
    await t.mutation(internal.automation.useNonce, {
      nonce: "nonce-1234567890123456",
    }),
  ).toBe(false);
  expect(
    await t.mutation(internal.automation.claimReminder, { loanId, lease: "a" }),
  ).toBeNull();
  vi.setSystemTime(new Date("2026-11-13T20:00:00Z"));
  const page = await t.query(internal.automation.overduePage, {});
  expect(page.loans).toEqual([{ loanId, date: "2026-11-14" }]);
  const [a, b] = await Promise.all([
    t.mutation(internal.automation.claimReminder, { loanId, lease: "a" }),
    t.mutation(internal.automation.claimReminder, { loanId, lease: "b" }),
  ]);
  expect([a, b].filter(Boolean)).toHaveLength(1);
  const claim = a ?? b;
  expect(
    await t.mutation(internal.automation.completeReminder, {
      key: claim!.key,
      lease: claim!.lease,
      success: true,
    }),
  ).toBe(true);
  expect(
    await t.mutation(internal.automation.completeReminder, {
      key: claim!.key,
      lease: claim!.lease,
      success: true,
    }),
  ).toBe(true);
  expect(
    await t.mutation(internal.automation.claimReminder, { loanId, lease: "c" }),
  ).toBeNull();
  expect(
    await t.run((ctx) => ctx.db.query("overdueReminders").collect()),
  ).toHaveLength(1);
  expect(await stranger.query(api.automation.loanActivity, { loanId })).toEqual(
    [],
  );
  const reminder = (await borrower.query(api.automation.mine, {})).find(
    (x) => x.status === "sent",
  );
  expect(reminder?.unreadId).toBeTruthy();
  await borrower.mutation(api.automation.markRead, {
    ids: [reminder!.unreadId!],
  });
  expect(
    (await borrower.query(api.automation.mine, {})).find(
      (x) => x.status === "sent",
    )?.unreadId,
  ).toBeNull();
  await borrower.mutation(api.loans.reportReturn, { loanId });
  vi.setSystemTime(new Date("2026-11-14T20:00:00Z"));
  expect((await t.query(internal.automation.overduePage, {})).loans).toEqual([
    { loanId, date: "2026-11-15" },
  ]);
  await lender.mutation(api.loans.confirmReturn, { loanId });
  expect((await t.query(internal.automation.overduePage, {})).loans).toEqual(
    [],
  );
});

test("HTTP service endpoints reject unauthenticated writes and replayed reads", async () => {
  const { t } = await setup();
  process.env.LENDLOOP_INBOUND_SECRET = "test-inbound-secret";
  try {
    expect((await t.fetch("/automation/overdue-loans")).status).toBe(401);
    expect(
      (
        await t.fetch("/automation/reminders/claim", {
          method: "POST",
          body: "{}",
        })
      ).status,
    ).toBe(401);
    const timestamp = String(Date.now()),
      nonce = "a0b1c2d3-1234-4567-89ab-0123456789ab";
    const signature = await hmac(
      process.env.LENDLOOP_INBOUND_SECRET,
      "GET",
      "/automation/overdue-loans",
      timestamp,
      nonce,
      "",
    );
    const options = {
      headers: {
        "x-lendloop-timestamp": timestamp,
        "x-lendloop-nonce": nonce,
        "x-lendloop-signature": signature,
      },
    };
    expect((await t.fetch("/automation/overdue-loans", options)).status).toBe(
      200,
    );
    expect((await t.fetch("/automation/overdue-loans", options)).status).toBe(
      401,
    );
  } finally {
    delete process.env.LENDLOOP_INBOUND_SECRET;
  }
});

test("failed dispatch retries, delivery is idempotent, and terminal errors stay visible", async () => {
  const { t, borrower, toolId } = await setup();
  await borrower.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-12",
    endDate: "2026-11-12",
  });
  const event = (
    await t.run((ctx) => ctx.db.query("automationEvents").collect())
  )[0];
  await t.mutation(internal.automation.claimEvent, {
    eventId: event._id,
    lease: "first",
  });
  await t.mutation(internal.automation.dispatchFailed, {
    eventId: event._id,
    lease: "first",
    code: "http_503",
  });
  expect(await t.run((ctx) => ctx.db.get(event._id))).toMatchObject({
    status: "retry_pending",
    attemptCount: 1,
    lastErrorCode: "http_503",
  });
  vi.advanceTimersByTime(60_001);
  await t.mutation(internal.automation.claimEvent, {
    eventId: event._id,
    lease: "second",
  });
  expect(
    await t.mutation(internal.automation.deliverEvent, {
      eventId: event._id,
      lease: "second",
      message: "A request arrived.",
    }),
  ).toBe(true);
  expect(
    await t.mutation(internal.automation.deliverEvent, {
      eventId: event._id,
      lease: "second",
      message: "A request arrived.",
    }),
  ).toBe(true);
  expect(
    await t.run((ctx) => ctx.db.query("notifications").collect()),
  ).toHaveLength(1);
  const another = await borrower.mutation(api.requests.create, {
    toolId,
    startDate: "2026-11-15",
    endDate: "2026-11-15",
  });
  const terminal = (
    await t.run((ctx) =>
      ctx.db
        .query("automationEvents")
        .withIndex("by_request", (q) => q.eq("requestId", another))
        .collect(),
    )
  )[0];
  await t.mutation(internal.automation.claimEvent, {
    eventId: terminal._id,
    lease: "auth",
  });
  await t.mutation(internal.automation.dispatchFailed, {
    eventId: terminal._id,
    lease: "auth",
    code: "authentication_failed",
  });
  expect((await t.run((ctx) => ctx.db.get(terminal._id)))?.status).toBe(
    "failed",
  );
});

test("overdue fixture is gated, isolated, and repeatable", async () => {
  const { t } = await setup();
  const args = { lenderClerkUserId: "lender", borrowerClerkUserId: "borrower" };
  await expect(
    t.mutation(internal.automationFixture.seedOverdue, args),
  ).rejects.toThrow("disabled");
  process.env.LENDLOOP_AUTOMATION_TEST_ALLOWED = "true";
  try {
    const loanId = await t.mutation(
      internal.automationFixture.seedOverdue,
      args,
    );
    expect(await t.mutation(internal.automationFixture.seedOverdue, args)).toBe(
      loanId,
    );
    expect((await t.query(internal.automation.overduePage, {})).loans).toEqual([
      { loanId, date: "2026-11-09" },
    ]);
  } finally {
    delete process.env.LENDLOOP_AUTOMATION_TEST_ALLOWED;
  }
});
