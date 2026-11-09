import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cover, currentUser, today } from "./borrowing";

const privateDetails = v.object({
  authorId: v.id("users"),
  isMine: v.boolean(),
  authorName: v.string(),
  phone: v.union(v.string(), v.null()),
  pickupPoint: v.union(v.string(), v.null()),
  instructions: v.union(v.string(), v.null()),
  updatedAt: v.number(),
});
const loanView = v.object({
  id: v.id("loans"),
  requestId: v.id("borrowRequests"),
  toolId: v.id("tools"),
  toolName: v.string(),
  coverUrl: v.union(v.string(), v.null()),
  borrowerName: v.string(),
  lenderName: v.string(),
  isLender: v.boolean(),
  startDate: v.string(),
  endDate: v.string(),
  days: v.number(),
  rateMinor: v.number(),
  totalMinor: v.number(),
  status: v.union(
    v.literal("reserved"),
    v.literal("return_pending"),
    v.literal("returned"),
  ),
  overdue: v.boolean(),
  requestCreatedAt: v.number(),
  approvedAt: v.number(),
  returnReportedAt: v.union(v.number(), v.null()),
  returnedAt: v.union(v.number(), v.null()),
  details: v.array(privateDetails),
});

export const detail = query({
  args: { loanId: v.id("loans") },
  returns: v.union(loanView, v.null()),
  handler: async (ctx, { loanId }) => {
    const me = await currentUser(ctx),
      loan = await ctx.db.get(loanId);
    if (!loan || (loan.borrowerId !== me._id && loan.lenderId !== me._id))
      return null;
    const [tool, borrower, lender, request, details] = await Promise.all([
      ctx.db.get(loan.toolId),
      ctx.db.get(loan.borrowerId),
      ctx.db.get(loan.lenderId),
      ctx.db.get(loan.requestId),
      ctx.db
        .query("loanHandoverDetails")
        .withIndex("by_loan_and_author", (q) => q.eq("loanId", loanId))
        .collect(),
    ]);
    return {
      id: loan._id,
      requestId: loan.requestId,
      toolId: loan.toolId,
      toolName: tool?.name ?? "Archived item",
      coverUrl: await cover(ctx, tool),
      borrowerName: borrower?.displayName ?? "Neighbor",
      lenderName: lender?.displayName ?? "Neighbor",
      isLender: loan.lenderId === me._id,
      startDate: loan.startDate,
      endDate: loan.endDate,
      days: loan.days,
      rateMinor: loan.rateMinor,
      totalMinor: loan.totalMinor,
      status: loan.status,
      overdue: loan.status !== "returned" && loan.endDate < today(),
      requestCreatedAt: request?.createdAt ?? loan.approvedAt,
      approvedAt: loan.approvedAt,
      returnReportedAt: loan.returnReportedAt ?? null,
      returnedAt: loan.returnedAt ?? null,
      details: await Promise.all(
        details.map(async (d) => ({
          authorId: d.authorId,
          isMine: d.authorId === me._id,
          authorName: (await ctx.db.get(d.authorId))?.displayName ?? "Neighbor",
          phone: d.phone ?? null,
          pickupPoint: d.pickupPoint ?? null,
          instructions: d.instructions ?? null,
          updatedAt: d.updatedAt,
        })),
      ),
    };
  },
});

export const reportReturn = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const me = await currentUser(ctx),
      loan = await ctx.db.get(loanId);
    if (!loan || loan.borrowerId !== me._id)
      throw new Error("Loan unavailable");
    if (loan.status === "returned") throw new Error("Return already confirmed");
    if (loan.status === "return_pending") return null;
    const now = Date.now();
    await ctx.db.patch(loanId, {
      status: "return_pending",
      returnReportedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const confirmReturn = mutation({
  args: { loanId: v.id("loans") },
  returns: v.null(),
  handler: async (ctx, { loanId }) => {
    const me = await currentUser(ctx),
      loan = await ctx.db.get(loanId);
    if (!loan || loan.lenderId !== me._id) throw new Error("Loan unavailable");
    if (loan.status === "returned") return null;
    const now = Date.now();
    await ctx.db.patch(loanId, {
      status: "returned",
      returnedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

export const saveHandover = mutation({
  args: {
    loanId: v.id("loans"),
    phone: v.string(),
    pickupPoint: v.string(),
    instructions: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const me = await currentUser(ctx),
      loan = await ctx.db.get(args.loanId);
    if (!loan || (loan.borrowerId !== me._id && loan.lenderId !== me._id))
      throw new Error("Loan unavailable");
    const phone = args.phone.trim(),
      pickupPoint = args.pickupPoint.trim(),
      instructions = args.instructions.trim();
    if (
      (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone)) ||
      pickupPoint.length > 200 ||
      instructions.length > 500
    )
      throw new Error("Check the handover details and try again");
    const existing = await ctx.db
      .query("loanHandoverDetails")
      .withIndex("by_loan_and_author", (q) =>
        q.eq("loanId", args.loanId).eq("authorId", me._id),
      )
      .unique();
    if (!phone && !pickupPoint && !instructions) {
      if (existing) await ctx.db.delete(existing._id);
    } else if (existing) {
      await ctx.db.patch(existing._id, {
        phone: phone || undefined,
        pickupPoint: pickupPoint || undefined,
        instructions: instructions || undefined,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("loanHandoverDetails", {
        loanId: args.loanId,
        authorId: me._id,
        phone: phone || undefined,
        pickupPoint: pickupPoint || undefined,
        instructions: instructions || undefined,
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});
