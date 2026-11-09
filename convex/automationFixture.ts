import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { today } from "./borrowing";

export const seedOverdue = internalMutation({
  args: { lenderClerkUserId: v.string(), borrowerClerkUserId: v.string() },
  returns: v.id("loans"),
  handler: async (ctx, args) => {
    if (process.env.LENDLOOP_AUTOMATION_TEST_ALLOWED !== "true")
      throw new Error("Automation fixture is disabled");
    if (args.lenderClerkUserId === args.borrowerClerkUserId)
      throw new Error("Use distinct test users");
    const lender = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) =>
        q.eq("clerkUserId", args.lenderClerkUserId),
      )
      .unique();
    const borrower = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) =>
        q.eq("clerkUserId", args.borrowerClerkUserId),
      )
      .unique();
    if (
      !lender?.societyId ||
      !borrower?.societyId ||
      lender.societyId !== borrower.societyId
    )
      throw new Error("Use two onboarded users in one test society");
    // shortcut: check the first 100 listings owned by a test user; add a fixture key index if test accounts grow beyond this.
    const existingTools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", lender._id))
      .take(100);
    const existingTool = existingTools.find(
      (tool) => tool.name === "Automation test · Overdue drill",
    );
    if (existingTool) {
      const requests = await ctx.db
        .query("borrowRequests")
        .withIndex("by_tool_and_borrower", (q) =>
          q.eq("toolId", existingTool._id).eq("borrowerId", borrower._id),
        )
        .take(10);
      for (const request of requests) {
        const loan = await ctx.db
          .query("loans")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .unique();
        if (loan) return loan._id;
      }
    }
    const date = new Date(Date.parse(`${today()}T00:00:00Z`) - 86_400_000)
      .toISOString()
      .slice(0, 10);
    const now = Date.now();
    const toolId = await ctx.db.insert("tools", {
      ownerId: lender._id,
      societyId: lender.societyId,
      name: "Automation test · Overdue drill",
      category: "Power Tools",
      condition: "good",
      description: "Synthetic automation fixture",
      active: false,
      pricing: { dailyAmount: 1000, currency: "INR" },
      createdAt: now,
      updatedAt: now,
    });
    const requestId = await ctx.db.insert("borrowRequests", {
      toolId,
      borrowerId: borrower._id,
      lenderId: lender._id,
      startDate: date,
      endDate: date,
      days: 1,
      rateMinor: 1000,
      totalMinor: 1000,
      currency: "INR",
      status: "approved",
      createdAt: now,
      updatedAt: now,
      respondedAt: now,
    });
    return ctx.db.insert("loans", {
      requestId,
      toolId,
      borrowerId: borrower._id,
      lenderId: lender._id,
      startDate: date,
      endDate: date,
      days: 1,
      rateMinor: 1000,
      totalMinor: 1000,
      currency: "INR",
      status: "reserved",
      approvedAt: now,
      updatedAt: now,
    });
  },
});
