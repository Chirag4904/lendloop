import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { currentUser, today } from "./borrowing";

export async function enqueue(
  ctx: MutationCtx,
  type: string,
  requestId: Id<"borrowRequests">,
  recipientId: Id<"users">,
  loanId?: Id<"loans">,
) {
  const now = Date.now();
  const eventId = await ctx.db.insert("automationEvents", {
    type,
    requestId,
    recipientId,
    loanId,
    status: "pending",
    attemptCount: 0,
    nextAttemptAt: now,
    createdAt: now,
  });
  await ctx.scheduler.runAfter(0, internal.automationDispatch.send, {
    eventId,
  });
}

export const claimEvent = internalMutation({
  args: { eventId: v.id("automationEvents"), lease: v.string() },
  returns: v.union(
    v.object({
      type: v.string(),
      recipientUserId: v.id("users"),
      requestId: v.id("borrowRequests"),
      toolName: v.string(),
      lease: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { eventId, lease }) => {
    const event = await ctx.db.get(eventId);
    if (
      !event ||
      !["pending", "retry_pending"].includes(event.status) ||
      event.nextAttemptAt > Date.now()
    )
      return null;
    const request = await ctx.db.get(event.requestId);
    const tool = request && (await ctx.db.get(request.toolId));
    await ctx.db.patch(eventId, {
      status: "processing",
      attemptCount: event.attemptCount + 1,
      lease,
    });
    await ctx.scheduler.runAfter(120_000, internal.automation.recoverEvent, {
      eventId,
      lease,
    });
    return {
      type: event.type,
      recipientUserId: event.recipientId,
      requestId: event.requestId,
      toolName: tool?.name ?? "an item",
      lease,
    };
  },
});

export const eventDelivered = internalQuery({
  args: { eventId: v.id("automationEvents") },
  returns: v.boolean(),
  handler: async (ctx, { eventId }) =>
    (await ctx.db.get(eventId))?.status === "delivered",
});

export const recoverEvent = internalMutation({
  args: { eventId: v.id("automationEvents"), lease: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await failEvent(ctx, args.eventId, args.lease, "lease_expired");
    return null;
  },
});

async function failEvent(
  ctx: MutationCtx,
  eventId: Id<"automationEvents">,
  lease: string,
  code: string,
) {
  const event = await ctx.db.get(eventId);
  if (!event || event.status !== "processing" || event.lease !== lease) return;
  const delay = Math.min(60_000 * 2 ** (event.attemptCount - 1), 3_600_000);
  const final =
    event.attemptCount >= 5 ||
    code === "authentication_failed" ||
    code === "automation_configuration_missing";
  await ctx.db.patch(eventId, {
    status: final ? "failed" : "retry_pending",
    lastErrorCode: code.slice(0, 40),
    nextAttemptAt: Date.now() + delay,
    lease: undefined,
  });
  if (!final)
    await ctx.scheduler.runAfter(delay, internal.automationDispatch.send, {
      eventId,
    });
}

export const dispatchFailed = internalMutation({
  args: {
    eventId: v.id("automationEvents"),
    lease: v.string(),
    code: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await failEvent(ctx, args.eventId, args.lease, args.code);
    return null;
  },
});

export const deliverEvent = internalMutation({
  args: {
    eventId: v.id("automationEvents"),
    lease: v.string(),
    message: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return false;
    if (event.status === "delivered") return true;
    if (
      event.status !== "processing" ||
      event.lease !== args.lease ||
      args.message.length < 1 ||
      args.message.length > 200
    )
      return false;
    const existing = await ctx.db
      .query("notifications")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (!existing)
      await ctx.db.insert("notifications", {
        eventId: args.eventId,
        recipientId: event.recipientId,
        loanId: event.loanId,
        message: args.message,
        createdAt: Date.now(),
      });
    await ctx.db.patch(args.eventId, {
      status: "delivered",
      deliveredAt: Date.now(),
      lease: undefined,
    });
    return true;
  },
});

export const useNonce = internalMutation({
  args: { nonce: v.string() },
  returns: v.boolean(),
  handler: async (ctx, { nonce }) => {
    if (nonce.length < 16 || nonce.length > 100) return false;
    if (
      await ctx.db
        .query("automationNonces")
        .withIndex("by_nonce", (q) => q.eq("nonce", nonce))
        .unique()
    )
      return false;
    await ctx.db.insert("automationNonces", { nonce, createdAt: Date.now() });
    return true;
  },
});

export const pruneNonces = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const cutoff = Date.now() - 86_400_000;
    const old = await ctx.db
      .query("automationNonces")
      .withIndex("by_created_at", (q) => q.lt("createdAt", cutoff))
      .take(200);
    for (const row of old) await ctx.db.delete(row._id);
    return null;
  },
});

export const overduePage = internalQuery({
  args: { cursor: v.optional(v.string()) },
  returns: v.object({
    loans: v.array(v.object({ loanId: v.id("loans"), date: v.string() })),
    cursor: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, { cursor }) => {
    const date = today();
    const page = await ctx.db
      .query("loans")
      .withIndex("by_end_date", (q) => q.lt("endDate", date))
      .paginate({ cursor: cursor ?? null, numItems: 50 });
    return {
      loans: page.page
        .filter((loan) => loan.status !== "returned")
        .map((loan) => ({ loanId: loan._id, date })),
      cursor: page.isDone ? null : page.continueCursor,
    };
  },
});

export const claimReminder = internalMutation({
  args: { loanId: v.id("loans"), lease: v.string() },
  returns: v.union(
    v.object({
      key: v.string(),
      lease: v.string(),
    }),
    v.null(),
  ),
  handler: async (ctx, { loanId, lease }) => {
    const loan = await ctx.db.get(loanId),
      date = today();
    if (!loan || loan.status === "returned" || loan.endDate >= date)
      return null;
    const key = `overdue:${loanId}:${date}`;
    const old = await ctx.db
      .query("overdueReminders")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (
      old?.status === "sent" ||
      (old?.status === "processing" && Date.now() - old.claimedAt < 120_000)
    )
      return null;
    if (old)
      await ctx.db.patch(old._id, {
        status: "processing",
        lease,
        claimedAt: Date.now(),
        lastErrorCode: undefined,
      });
    else
      await ctx.db.insert("overdueReminders", {
        key,
        loanId,
        recipientId: loan.borrowerId,
        date,
        status: "processing",
        lease,
        claimedAt: Date.now(),
      });
    return {
      key,
      lease,
    };
  },
});

export const completeReminder = internalMutation({
  args: { key: v.string(), lease: v.string(), success: v.boolean() },
  returns: v.boolean(),
  handler: async (ctx, { key, lease, success }) => {
    const row = await ctx.db
      .query("overdueReminders")
      .withIndex("by_key", (q) => q.eq("key", key))
      .unique();
    if (!row) return false;
    if (row.status === "sent") return true;
    if (row.status !== "processing" || row.lease !== lease) return false;
    const loan = await ctx.db.get(row.loanId);
    if (success && (!loan || loan.status === "returned")) {
      await ctx.db.patch(row._id, {
        status: "failed",
        lastErrorCode: "loan_closed",
      });
      return false;
    }
    if (success)
      await ctx.db.patch(row._id, { status: "sent", sentAt: Date.now() });
    else
      await ctx.db.patch(row._id, {
        status: "failed",
        lastErrorCode: "delivery_failed",
      });
    return true;
  },
});

export const recoverReminders = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("overdueReminders")
      .withIndex("by_status_and_claimed_at", (q) =>
        q.eq("status", "processing").lt("claimedAt", Date.now() - 120_000),
      )
      .take(100);
    for (const row of rows)
      await ctx.db.patch(row._id, {
        status: "failed",
        lastErrorCode: "lease_expired",
      });
    return null;
  },
});

const updateId = v.union(v.id("notifications"), v.id("overdueReminders"));

export const mine = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.string(),
      message: v.string(),
      createdAt: v.number(),
      status: v.string(),
      unreadId: v.union(updateId, v.null()),
    }),
  ),
  handler: async (ctx) => {
    const me = await currentUser(ctx);
    const events = await ctx.db
      .query("automationEvents")
      .withIndex("by_recipient", (q) => q.eq("recipientId", me._id))
      .order("desc")
      .take(50);
    const notes = await Promise.all(
      events.map(async (event) => {
        const note = await ctx.db
          .query("notifications")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .unique();
        return {
          id: event._id,
          message:
            note?.message ??
            event.type.replaceAll("_", " ").replaceAll(".", " · "),
          createdAt: note?.createdAt ?? event.createdAt,
          status: event.status,
          unreadId: note && note.readAt === undefined ? note._id : null,
        };
      }),
    );
    const reminders = await ctx.db
      .query("overdueReminders")
      .withIndex("by_recipient", (q) => q.eq("recipientId", me._id))
      .order("desc")
      .take(30);
    return [
      ...notes,
      ...reminders.map((r) => ({
        id: r._id as string,
        message: `Overdue reminder · ${r.date}`,
        createdAt: r.sentAt ?? r.claimedAt,
        status: r.status,
        unreadId: r.status === "sent" && r.readAt === undefined ? r._id : null,
      })),
    ]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);
  },
});

export const markRead = mutation({
  args: { ids: v.array(updateId) },
  returns: v.null(),
  handler: async (ctx, { ids }) => {
    const me = await currentUser(ctx);
    if (ids.length > 50) throw new Error("Select up to 50 updates");
    const readAt = Date.now();
    for (const id of new Set(ids)) {
      const update = await ctx.db.get(id);
      if (
        update?.recipientId === me._id &&
        update.readAt === undefined &&
        (!("status" in update) || update.status === "sent")
      )
        await ctx.db.patch(id, { readAt });
    }
    return null;
  },
});

export const loanActivity = query({
  args: { loanId: v.id("loans") },
  returns: v.array(
    v.object({
      id: v.string(),
      message: v.string(),
      at: v.number(),
      status: v.string(),
    }),
  ),
  handler: async (ctx, { loanId }) => {
    const me = await currentUser(ctx),
      loan = await ctx.db.get(loanId);
    if (!loan || (loan.borrowerId !== me._id && loan.lenderId !== me._id))
      return [];
    const events = await ctx.db
      .query("automationEvents")
      .withIndex("by_request", (q) => q.eq("requestId", loan.requestId))
      .take(50);
    const reminders = await ctx.db
      .query("overdueReminders")
      .withIndex("by_loan", (q) => q.eq("loanId", loanId))
      .order("desc")
      .take(30);
    return [
      ...events.map((e) => ({
        id: e._id,
        message: e.type.replaceAll("_", " ").replaceAll(".", " · "),
        at: e.deliveredAt ?? e.createdAt,
        status: e.status,
      })),
      ...reminders.map((r) => ({
        id: r._id,
        message: `Overdue reminder · ${r.date}`,
        at: r.sentAt ?? r.claimedAt,
        status: r.status,
      })),
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, 50);
  },
});
