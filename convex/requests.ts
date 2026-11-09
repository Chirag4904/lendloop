import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { enqueue } from "./automation";
import {
  cover,
  currentUser,
  days,
  loanForRequest,
  overlaps,
  today,
} from "./borrowing";

const requestView = v.object({
  id: v.id("borrowRequests"),
  toolId: v.id("tools"),
  toolName: v.string(),
  coverUrl: v.union(v.string(), v.null()),
  otherName: v.string(),
  trusted: v.boolean(),
  startDate: v.string(),
  endDate: v.string(),
  days: v.number(),
  rateMinor: v.number(),
  totalMinor: v.number(),
  listedRateMinor: v.number(),
  borrowerOfferMinor: v.union(v.number(), v.null()),
  lenderCounterMinor: v.union(v.number(), v.null()),
  priceDecision: v.union(
    v.literal("accepted_offer"),
    v.literal("countered"),
    v.literal("kept_listed_price"),
    v.null(),
  ),
  lenderRespondedAt: v.union(v.number(), v.null()),
  borrowerRespondedAt: v.union(v.number(), v.null()),
  status: v.union(
    v.literal("pending"),
    v.literal("awaiting_borrower"),
    v.literal("approved"),
    v.literal("declined"),
    v.literal("cancelled"),
  ),
  loanId: v.union(v.id("loans"), v.null()),
  loanStatus: v.union(
    v.literal("reserved"),
    v.literal("return_pending"),
    v.literal("returned"),
    v.null(),
  ),
  conflict: v.boolean(),
  createdAt: v.number(),
});

function requirePending(
  status: Doc<"borrowRequests">["status"],
  action: string,
) {
  if (status !== "pending")
    throw new Error(`Only pending requests can be ${action}`);
}

async function reservationConflict(
  ctx: QueryCtx,
  toolId: Doc<"tools">["_id"],
  startDate: string,
  endDate: string,
) {
  // shortcut: scan active reservations through the requested end date; partition if one tool has thousands of simultaneous loans.
  const active = await Promise.all(
    (["reserved", "return_pending"] as const).map((status) =>
      ctx.db
        .query("loans")
        .withIndex("by_tool_and_status_and_start_date", (q) =>
          q.eq("toolId", toolId).eq("status", status).lte("startDate", endDate),
        )
        .collect(),
    ),
  );
  return active.flat().some((loan) => overlaps(loan, { startDate, endDate }));
}

async function view(
  ctx: QueryCtx,
  request: Doc<"borrowRequests">,
  incoming: boolean,
) {
  const tool = await ctx.db.get(request.toolId);
  const other = await ctx.db.get(
    incoming ? request.borrowerId : request.lenderId,
  );
  const loan = await loanForRequest(ctx, request._id);
  return {
    id: request._id,
    toolId: request.toolId,
    toolName: tool?.name ?? "Archived item",
    coverUrl: await cover(ctx, tool),
    otherName: other?.displayName ?? "Neighbor",
    trusted: incoming
      ? (other?.trustedBorrower ?? false)
      : (other?.trustedLender ?? false),
    startDate: request.startDate,
    endDate: request.endDate,
    days: request.days,
    rateMinor: request.rateMinor,
    totalMinor: request.totalMinor,
    listedRateMinor: request.listedRateMinor ?? request.rateMinor,
    borrowerOfferMinor: request.borrowerOfferMinor ?? null,
    lenderCounterMinor: request.lenderCounterMinor ?? null,
    priceDecision: request.priceDecision ?? null,
    lenderRespondedAt: request.respondedAt ?? null,
    borrowerRespondedAt: request.borrowerRespondedAt ?? null,
    status: request.status,
    loanId: loan?._id ?? null,
    loanStatus: loan?.status ?? null,
    conflict:
      incoming && request.status === "pending"
        ? await reservationConflict(
            ctx,
            request.toolId,
            request.startDate,
            request.endDate,
          )
        : false,
    createdAt: request.createdAt,
  };
}

export const availability = query({
  args: { toolId: v.id("tools"), startDate: v.string(), endDate: v.string() },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const me = await currentUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool?.active || tool.archived || tool.ownerId === me._id) return false;
    days(args.startDate, args.endDate);
    return !(await reservationConflict(
      ctx,
      args.toolId,
      args.startDate,
      args.endDate,
    ));
  },
});

export const create = mutation({
  args: {
    toolId: v.id("tools"),
    startDate: v.string(),
    endDate: v.string(),
    offerMinor: v.optional(v.number()),
  },
  returns: v.id("borrowRequests"),
  handler: async (ctx, args) => {
    const me = await currentUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool?.active || tool.archived) throw new Error("Listing unavailable");
    if (tool.ownerId === me._id)
      throw new Error("You cannot request your own item");
    const duration = days(args.startDate, args.endDate);
    const existing = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool_and_borrower", (q) =>
        q.eq("toolId", args.toolId).eq("borrowerId", me._id),
      )
      .collect();
    for (const r of existing) {
      if (
        args.offerMinor !== undefined &&
        r.borrowerOfferMinor !== undefined &&
        overlaps(r, args)
      )
        throw new Error("You already made an offer for these dates");
      if (r.startDate !== args.startDate || r.endDate !== args.endDate)
        continue;
      if (r.status === "pending" || r.status === "awaiting_borrower")
        throw new Error("You already have a request for these dates");
      if (r.status === "approved") {
        const loan = await ctx.db
          .query("loans")
          .withIndex("by_request", (q) => q.eq("requestId", r._id))
          .unique();
        if (loan?.status !== "returned")
          throw new Error("You already have a request for these dates");
      }
    }
    const now = Date.now(),
      rateMinor = tool.pricing?.dailyAmount ?? 0;
    if (
      args.offerMinor !== undefined &&
      (!tool.pricing ||
        !Number.isSafeInteger(args.offerMinor) ||
        args.offerMinor <= 0 ||
        args.offerMinor >= rateMinor ||
        !Number.isSafeInteger(args.offerMinor * duration))
    )
      throw new Error(
        "Offer must be a positive amount below the listed daily price",
      );
    const requestId = await ctx.db.insert("borrowRequests", {
      toolId: tool._id,
      borrowerId: me._id,
      lenderId: tool.ownerId,
      startDate: args.startDate,
      endDate: args.endDate,
      days: duration,
      rateMinor,
      totalMinor: rateMinor * duration,
      listedRateMinor: args.offerMinor === undefined ? undefined : rateMinor,
      borrowerOfferMinor: args.offerMinor,
      currency: "INR",
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await enqueue(
      ctx,
      args.offerMinor === undefined
        ? "borrow_request.created"
        : "borrower.offer",
      requestId,
      tool.ownerId,
    );
    return requestId;
  },
});

export const mine = query({
  args: {},
  returns: v.array(requestView),
  handler: async (ctx) => {
    const me = await currentUser(ctx);
    const rows = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", me._id))
      .order("desc")
      .take(100);
    return Promise.all(rows.map((r) => view(ctx, r, false)));
  },
});

export const incoming = query({
  args: {},
  returns: v.array(requestView),
  handler: async (ctx) => {
    const me = await currentUser(ctx);
    const rows = await ctx.db
      .query("borrowRequests")
      .withIndex("by_lender", (q) => q.eq("lenderId", me._id))
      .order("desc")
      .take(100);
    return Promise.all(rows.map((r) => view(ctx, r, true)));
  },
});

export const cancel = mutation({
  args: { requestId: v.id("borrowRequests") },
  returns: v.null(),
  handler: async (ctx, { requestId }) => {
    const me = await currentUser(ctx),
      request = await ctx.db.get(requestId);
    if (!request || request.borrowerId !== me._id)
      throw new Error("Request unavailable");
    requirePending(request.status, "cancelled");
    await ctx.db.patch(requestId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
    await enqueue(ctx, "borrow_request.cancelled", requestId, request.lenderId);
    return null;
  },
});

export const decline = mutation({
  args: { requestId: v.id("borrowRequests") },
  returns: v.null(),
  handler: async (ctx, { requestId }) => {
    const me = await currentUser(ctx),
      request = await ctx.db.get(requestId);
    if (!request || request.lenderId !== me._id)
      throw new Error("Request unavailable");
    requirePending(request.status, "declined");
    const now = Date.now();
    await ctx.db.patch(requestId, {
      status: "declined",
      respondedAt: now,
      updatedAt: now,
    });
    await enqueue(
      ctx,
      "borrow_request.declined",
      requestId,
      request.borrowerId,
    );
    return null;
  },
});

export const approve = mutation({
  args: { requestId: v.id("borrowRequests") },
  returns: v.id("loans"),
  handler: async (ctx, { requestId }) => {
    const me = await currentUser(ctx),
      request = await ctx.db.get(requestId);
    if (!request || request.lenderId !== me._id)
      throw new Error("Request unavailable");
    if (request.borrowerOfferMinor !== undefined)
      throw new Error("Use a price decision for this offer");
    if (request.status === "approved") {
      const loan = await loanForRequest(ctx, requestId);
      if (loan) return loan._id;
      throw new Error("Approved loan unavailable");
    }
    requirePending(request.status, "approved");
    return confirm(ctx, request, request.rateMinor);
  },
});

async function confirm(
  ctx: MutationCtx,
  request: Doc<"borrowRequests">,
  rateMinor: number,
) {
  const tool = await ctx.db.get(request.toolId);
  if (!tool?.active || tool.archived || tool.ownerId !== request.lenderId)
    throw new Error("Listing unavailable");
  if (request.startDate < today()) throw new Error("Request dates have passed");
  if (days(request.startDate, request.endDate) !== request.days)
    throw new Error("Request dates are invalid");
  if (
    !Number.isSafeInteger(rateMinor) ||
    rateMinor < 0 ||
    !Number.isSafeInteger(rateMinor * request.days)
  )
    throw new Error("Invalid rental price");
  if (
    await reservationConflict(
      ctx,
      request.toolId,
      request.startDate,
      request.endDate,
    )
  )
    throw new Error("These dates are already reserved. Choose other dates.");
  const now = Date.now(),
    totalMinor = rateMinor * request.days;
  const loanId = await ctx.db.insert("loans", {
    requestId: request._id,
    toolId: request.toolId,
    borrowerId: request.borrowerId,
    lenderId: request.lenderId,
    startDate: request.startDate,
    endDate: request.endDate,
    days: request.days,
    rateMinor,
    totalMinor,
    currency: request.currency,
    status: "reserved",
    approvedAt: now,
    updatedAt: now,
  });
  await ctx.db.patch(request._id, {
    status: "approved",
    rateMinor,
    totalMinor,
    updatedAt: now,
    ...(request.respondedAt ? {} : { respondedAt: now }),
    ...(request.borrowerOfferMinor && request.priceDecision
      ? { borrowerRespondedAt: now }
      : {}),
  });
  await enqueue(
    ctx,
    request.borrowerOfferMinor === undefined
      ? "borrow_request.approved"
      : request.priceDecision
        ? "borrower.final_accepted"
        : "lender.offer_accepted",
    request._id,
    request.priceDecision ? request.lenderId : request.borrowerId,
    loanId,
  );
  return loanId;
}

export const respondToOffer = mutation({
  args: {
    requestId: v.id("borrowRequests"),
    decision: v.union(
      v.literal("accepted_offer"),
      v.literal("countered"),
      v.literal("kept_listed_price"),
    ),
    counterMinor: v.optional(v.number()),
  },
  returns: v.union(v.id("loans"), v.null()),
  handler: async (ctx, { requestId, decision, counterMinor }) => {
    const me = await currentUser(ctx),
      request = await ctx.db.get(requestId);
    if (
      !request ||
      request.lenderId !== me._id ||
      request.borrowerOfferMinor === undefined
    )
      throw new Error("Offer unavailable");
    requirePending(request.status, "answered");
    const tool = await ctx.db.get(request.toolId);
    if (!tool?.active || tool.archived || tool.ownerId !== me._id)
      throw new Error("Listing unavailable");
    const listed = request.listedRateMinor ?? request.rateMinor;
    if (
      decision === "countered"
        ? !Number.isSafeInteger(counterMinor) ||
          counterMinor! <= request.borrowerOfferMinor ||
          counterMinor! >= listed
        : counterMinor !== undefined
    )
      throw new Error(
        "Counteroffer must be between the offered and listed daily prices",
      );
    const now = Date.now();
    if (decision === "accepted_offer") {
      const loanId = await confirm(ctx, request, request.borrowerOfferMinor);
      await ctx.db.patch(requestId, { priceDecision: decision });
      return loanId;
    }
    await ctx.db.patch(requestId, {
      status: "awaiting_borrower",
      priceDecision: decision,
      lenderCounterMinor: counterMinor,
      respondedAt: now,
      updatedAt: now,
    });
    await enqueue(
      ctx,
      decision === "countered"
        ? "lender.countered"
        : "lender.kept_listed_price",
      requestId,
      request.borrowerId,
    );
    return null;
  },
});

export const respondToFinalPrice = mutation({
  args: { requestId: v.id("borrowRequests"), accept: v.boolean() },
  returns: v.union(v.id("loans"), v.null()),
  handler: async (ctx, { requestId, accept }) => {
    const me = await currentUser(ctx),
      request = await ctx.db.get(requestId);
    if (
      !request ||
      request.borrowerId !== me._id ||
      request.borrowerOfferMinor === undefined
    )
      throw new Error("Offer unavailable");
    if (
      request.status !== "awaiting_borrower" ||
      (request.priceDecision !== "countered" &&
        request.priceDecision !== "kept_listed_price")
    )
      throw new Error("This price decision is no longer available");
    if (!accept) {
      const now = Date.now();
      await ctx.db.patch(requestId, {
        status: "cancelled",
        borrowerRespondedAt: now,
        updatedAt: now,
      });
      await enqueue(ctx, "borrower.walked_away", requestId, request.lenderId);
      return null;
    }
    return confirm(
      ctx,
      request,
      request.priceDecision === "countered"
        ? request.lenderCounterMinor!
        : request.listedRateMinor!,
    );
  },
});
