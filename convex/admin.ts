import {
  paginationOptsValidator,
  paginationResultValidator,
  type PaginationOptions,
} from "convex/server";
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { today } from "./borrowing";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (user?.role !== "admin") throw new Error("Admin access required");
  return user;
}

async function audit(
  ctx: MutationCtx,
  actorId: Id<"users">,
  action: string,
  targetType: string,
  targetId: string,
  detail?: string,
) {
  await ctx.db.insert("adminAudit", {
    actorId,
    action,
    targetType,
    targetId,
    detail,
    createdAt: Date.now(),
  });
}

const normalize = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
function societyFields(input: {
  name: string;
  city: string;
  locality: string;
  latitude: number;
  longitude: number;
}) {
  const name = input.name.trim().replace(/\s+/g, " ");
  const city = input.city.trim().replace(/\s+/g, " ");
  const locality = input.locality.trim().replace(/\s+/g, " ");
  if (
    name.length < 2 ||
    name.length > 100 ||
    !city ||
    city.length > 100 ||
    !locality ||
    locality.length > 100
  )
    throw new Error(
      "Enter a society name, city, and locality (each up to 100 characters)",
    );
  if (
    !Number.isFinite(input.latitude) ||
    input.latitude < -90 ||
    input.latitude > 90 ||
    !Number.isFinite(input.longitude) ||
    input.longitude < -180 ||
    input.longitude > 180
  )
    throw new Error("Enter valid coordinates");
  return {
    name,
    city,
    locality,
    latitude: input.latitude,
    longitude: input.longitude,
  };
}
async function duplicate(
  ctx: MutationCtx,
  fields: { name: string; city: string; locality: string },
  except?: Id<"societies">,
) {
  // shortcut: refuse writes beyond 1,000 societies until a normalized-key backfill and index exist.
  const rows = await ctx.db.query("societies").take(1001);
  if (rows.length > 1000)
    throw new Error("Directory limit reached; contact an operator");
  return rows.find(
    (s) =>
      s._id !== except &&
      normalize(s.name) === normalize(fields.name) &&
      normalize(s.city) === normalize(fields.city) &&
      normalize(s.locality) === normalize(fields.locality),
  );
}
const societyArgs = {
  name: v.string(),
  city: v.string(),
  locality: v.string(),
  latitude: v.number(),
  longitude: v.number(),
};
const paged = { paginationOpts: paginationOptsValidator };
const pageResult = paginationResultValidator(v.any());
const cap = (opts: PaginationOptions) => ({
  ...opts,
  numItems: Math.min(50, Math.max(1, opts.numItems)),
});

// Run only with a deployment admin key via `npx convex run --deployment ... admin:provisionInitial`.
export const provisionInitial = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkUserId }) => {
    if (!clerkUserId.trim() || clerkUserId.length > 200)
      throw new Error("Invalid Clerk subject");
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();
    if (existingAdmin) throw new Error("An admin already exists");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (!user) throw new Error("The intended admin must sign in first");
    await ctx.db.patch(user._id, { role: "admin", updatedAt: Date.now() });
    await ctx.db.insert("adminAudit", {
      action: "admin.provisioned",
      targetType: "user",
      targetId: user._id,
      detail: "Deployment operator",
      createdAt: Date.now(),
    });
    return null;
  },
});

// Deployment operators transfer admin access without deleting either user's data.
export const transferAdmin = internalMutation({
  args: { currentClerkUserId: v.string(), nextClerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, { currentClerkUserId, nextClerkUserId }) => {
    if (
      !currentClerkUserId.trim() ||
      !nextClerkUserId.trim() ||
      currentClerkUserId === nextClerkUserId
    )
      throw new Error("Choose two different users");
    const current = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) =>
        q.eq("clerkUserId", currentClerkUserId),
      )
      .unique();
    const next = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", nextClerkUserId))
      .unique();
    if (!current || current.role !== "admin")
      throw new Error("Current admin does not match");
    if (!next || next.role !== "user")
      throw new Error("New admin must have a user profile");
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .take(2);
    if (admins.length !== 1 || admins[0]._id !== current._id)
      throw new Error("Expected exactly one admin");
    const now = Date.now();
    await ctx.db.patch(current._id, { role: "user", updatedAt: now });
    await ctx.db.patch(next._id, { role: "admin", updatedAt: now });
    await ctx.db.insert("adminAudit", {
      action: "admin.transferred",
      targetType: "user",
      targetId: next._id,
      detail: `Deployment operator; previous admin ${current._id}`,
      createdAt: now,
    });
    return null;
  },
});

export const access = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    return user?.role === "admin";
  },
});

export const overview = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const date = today();
    const [
      users,
      listings,
      reserved,
      returnPending,
      requests,
      suggestions,
      failed,
      overdueReserved,
      overduePending,
    ] = await Promise.all([
      ctx.db.query("users").take(1001),
      ctx.db
        .query("tools")
        .withIndex("by_active", (q) => q.eq("active", true))
        .take(1001),
      ctx.db
        .query("loans")
        .withIndex("by_status_and_end_date", (q) => q.eq("status", "reserved"))
        .take(1001),
      ctx.db
        .query("loans")
        .withIndex("by_status_and_end_date", (q) =>
          q.eq("status", "return_pending"),
        )
        .take(1001),
      ctx.db
        .query("borrowRequests")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(1001),
      ctx.db
        .query("societySuggestions")
        .withIndex("by_status", (q) => q.eq("status", "pending"))
        .take(1001),
      ctx.db
        .query("automationEvents")
        .withIndex("by_status", (q) => q.eq("status", "failed"))
        .take(1001),
      ctx.db
        .query("loans")
        .withIndex("by_status_and_end_date", (q) =>
          q.eq("status", "reserved").lt("endDate", date),
        )
        .take(1001),
      ctx.db
        .query("loans")
        .withIndex("by_status_and_end_date", (q) =>
          q.eq("status", "return_pending").lt("endDate", date),
        )
        .take(1001),
    ]);
    return {
      users: users.length,
      listings: listings.filter((x) => !x.archived).length,
      activeLoans:
        reserved.filter((loan) => loan.startDate <= date).length +
        returnPending.filter((loan) => loan.startDate <= date).length,
      pendingRequests: requests.length,
      overdueLoans: overdueReserved.length + overduePending.length,
      pendingSuggestions: suggestions.length,
      failedEvents: failed.length,
      capped: {
        users: users.length > 1000,
        listings: listings.length > 1000,
        activeLoans: reserved.length > 1000 || returnPending.length > 1000,
        pendingRequests: requests.length > 1000,
        overdueLoans:
          overdueReserved.length > 1000 || overduePending.length > 1000,
        pendingSuggestions: suggestions.length > 1000,
        failedEvents: failed.length > 1000,
      },
    };
  },
});

export const users = query({
  args: paged,
  returns: pageResult,
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db
      .query("users")
      .order("desc")
      .paginate(cap(paginationOpts));
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (user) => ({
          id: user._id,
          name: user.displayName,
          email: user.email ?? null,
          account: user._id.slice(-8),
          society: user.societyId
            ? ((await ctx.db.get(user.societyId))?.name ?? "Inactive")
            : "None",
          createdAt: user.createdAt,
          role: user.role,
          trustedLender: user.trustedLender,
          trustedBorrower: user.trustedBorrower,
        })),
      ),
    };
  },
});

export const setTrust = mutation({
  args: {
    userId: v.id("users"),
    badge: v.union(v.literal("trustedLender"), v.literal("trustedBorrower")),
    value: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { userId, badge, value }) => {
    const actor = await requireAdmin(ctx);
    const target = await ctx.db.get(userId);
    if (!target) throw new Error("User unavailable");
    if (target[badge] === value) return null;
    await ctx.db.patch(userId, { [badge]: value, updatedAt: Date.now() });
    await audit(
      ctx,
      actor._id,
      `${badge}.${value ? "granted" : "revoked"}`,
      "user",
      userId,
    );
    return null;
  },
});

export const listings = query({
  args: paged,
  returns: pageResult,
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db
      .query("tools")
      .order("desc")
      .paginate(cap(paginationOpts));
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (tool) => {
          const [owner, society, photo] = await Promise.all([
            ctx.db.get(tool.ownerId),
            ctx.db.get(tool.societyId),
            tool.photoIds?.[0] ? ctx.db.get(tool.photoIds[0]) : null,
          ]);
          return {
            id: tool._id,
            name: tool.name,
            category: tool.category,
            condition: tool.condition,
            description: tool.description,
            owner: owner?.displayName ?? "Neighbor",
            society: society?.name ?? "Unknown",
            societyId: tool.societyId,
            dailyAmount: tool.pricing?.dailyAmount ?? null,
            status: tool.archived
              ? "removed"
              : tool.active
                ? "active"
                : "unlisted",
            createdAt: tool.createdAt,
            updatedAt: tool.updatedAt,
            coverUrl:
              photo?.toolId === tool._id
                ? await ctx.storage.getUrl(photo.storageId)
                : null,
          };
        }),
      ),
    };
  },
});

export const removeListing = mutation({
  args: { toolId: v.id("tools"), reason: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { toolId, reason }) => {
    const actor = await requireAdmin(ctx);
    const tool = await ctx.db.get(toolId);
    if (!tool) throw new Error("Listing unavailable");
    if (tool.archived) return null;
    const detail = reason?.trim();
    if (detail && detail.length > 200)
      throw new Error("Reason must be under 200 characters");
    await ctx.db.patch(toolId, {
      active: false,
      archived: true,
      updatedAt: Date.now(),
    });
    await audit(
      ctx,
      actor._id,
      "listing.removed",
      "tool",
      toolId,
      detail || undefined,
    );
    return null;
  },
});

export const loans = query({
  args: paged,
  returns: pageResult,
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db
      .query("loans")
      .order("desc")
      .paginate(cap(paginationOpts));
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (loan) => {
          const [tool, lender, borrower, request] = await Promise.all([
            ctx.db.get(loan.toolId),
            ctx.db.get(loan.lenderId),
            ctx.db.get(loan.borrowerId),
            ctx.db.get(loan.requestId),
          ]);
          const [lenderSociety, borrowerSociety] = await Promise.all([
            lender?.societyId ? ctx.db.get(lender.societyId) : null,
            borrower?.societyId ? ctx.db.get(borrower.societyId) : null,
          ]);
          return {
            id: loan._id,
            toolName: tool?.name ?? "Archived item",
            lender: lender?.displayName ?? "Neighbor",
            borrower: borrower?.displayName ?? "Neighbor",
            lenderSociety: lenderSociety?.name ?? "Unknown",
            borrowerSociety: borrowerSociety?.name ?? "Unknown",
            startDate: loan.startDate,
            endDate: loan.endDate,
            totalMinor: loan.totalMinor,
            rateMinor: loan.rateMinor,
            status: loan.status,
            overdue: loan.status !== "returned" && loan.endDate < today(),
            approvedAt: loan.approvedAt,
            returnedAt: loan.returnedAt ?? null,
            returnReportedAt: loan.returnReportedAt ?? null,
            requestStatus: request?.status ?? "unknown",
            requestCreatedAt: request?.createdAt ?? loan.approvedAt,
            priceDecision: request?.priceDecision ?? null,
            listedRateMinor: request?.listedRateMinor ?? loan.rateMinor,
            borrowerOfferMinor: request?.borrowerOfferMinor ?? null,
            lenderCounterMinor: request?.lenderCounterMinor ?? null,
          };
        }),
      ),
    };
  },
});

export const loanActivity = query({
  args: { loanId: v.id("loans") },
  returns: v.array(
    v.object({
      id: v.id("automationEvents"),
      type: v.string(),
      status: v.string(),
      createdAt: v.number(),
      error: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, { loanId }) => {
    await requireAdmin(ctx);
    if (!(await ctx.db.get(loanId))) return [];
    const events = await ctx.db
      .query("automationEvents")
      .withIndex("by_loan", (q) => q.eq("loanId", loanId))
      .order("desc")
      .take(50);
    return events.map((e) => ({
      id: e._id,
      type: e.type,
      status: e.status,
      createdAt: e.createdAt,
      error: e.lastErrorCode ?? null,
    }));
  },
});

export const societies = query({
  args: paged,
  returns: pageResult,
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db
      .query("societies")
      .order("desc")
      .paginate(cap(paginationOpts));
    return {
      ...result,
      page: result.page.map((s) => ({
        id: s._id,
        name: s.name,
        city: s.city,
        locality: s.locality,
        latitude: s.latitude,
        longitude: s.longitude,
        status: s.status,
        createdAt: s.createdAt,
      })),
    };
  },
});

export const saveSociety = mutation({
  args: {
    societyId: v.optional(v.id("societies")),
    ...societyArgs,
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  returns: v.id("societies"),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const fields = societyFields(args);
    if (await duplicate(ctx, fields, args.societyId))
      throw new Error(
        "A society with this name, city, and locality already exists",
      );
    const now = Date.now();
    if (args.societyId) {
      const current = await ctx.db.get(args.societyId);
      if (!current) throw new Error("Society unavailable");
      await ctx.db.patch(args.societyId, {
        ...fields,
        status: args.status,
        updatedAt: now,
      });
      await audit(
        ctx,
        actor._id,
        current.status !== args.status
          ? `society.${args.status}`
          : "society.edited",
        "society",
        args.societyId,
      );
      return args.societyId;
    }
    const id = await ctx.db.insert("societies", {
      ...fields,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    });
    await audit(ctx, actor._id, "society.created", "society", id);
    return id;
  },
});

export const suggestions = query({
  args: paged,
  returns: pageResult,
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db
      .query("societySuggestions")
      .order("desc")
      .paginate(cap(paginationOpts));
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (s) => ({
          id: s._id,
          name: s.name,
          city: s.city ?? "",
          locality: s.locality ?? "",
          status: s.status,
          createdAt: s.createdAt,
          submitter:
            (await ctx.db.get(s.suggestingUserId))?.displayName ?? "Neighbor",
          societyId: s.societyId ?? null,
        })),
      ),
    };
  },
});

export const moderateSuggestion = mutation({
  args: {
    suggestionId: v.id("societySuggestions"),
    decision: v.union(v.literal("approve"), v.literal("reject")),
    societyId: v.optional(v.id("societies")),
    details: v.optional(v.object(societyArgs)),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion || suggestion.status !== "pending")
      throw new Error("Suggestion was already reviewed");
    let societyId: Id<"societies"> | undefined;
    if (args.decision === "approve") {
      if (args.societyId) {
        const society = await ctx.db.get(args.societyId);
        if (!society || society.status !== "active")
          throw new Error("Choose an active society");
        societyId = society._id;
      } else {
        if (!args.details)
          throw new Error("Coordinates and directory details are required");
        const fields = societyFields(args.details);
        if (await duplicate(ctx, fields))
          throw new Error(
            "Society already exists; associate this suggestion with it",
          );
        const now = Date.now();
        societyId = await ctx.db.insert("societies", {
          ...fields,
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
        await audit(ctx, actor._id, "society.created", "society", societyId);
      }
    }
    await ctx.db.patch(args.suggestionId, {
      status: args.decision === "approve" ? "approved" : "rejected",
      societyId,
      updatedAt: Date.now(),
    });
    await audit(
      ctx,
      actor._id,
      `suggestion.${args.decision === "approve" ? "approved" : "rejected"}`,
      "suggestion",
      args.suggestionId,
      societyId,
    );
    return null;
  },
});

export const auditHistory = query({
  args: paged,
  returns: pageResult,
  handler: async (ctx, { paginationOpts }) => {
    await requireAdmin(ctx);
    const result = await ctx.db
      .query("adminAudit")
      .order("desc")
      .paginate(cap(paginationOpts));
    return {
      ...result,
      page: await Promise.all(
        result.page.map(async (a) => ({
          id: a._id,
          action: a.action,
          actor: a.actorId
            ? ((await ctx.db.get(a.actorId))?.displayName ?? "Admin")
            : "Deployment operator",
          targetType: a.targetType,
          targetId: a.targetId.slice(-8),
          detail: a.detail ?? null,
          createdAt: a.createdAt,
        })),
      ),
    };
  },
});

export const automation = query({
  args: {
    ...paged,
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("processing"),
        v.literal("retry_pending"),
        v.literal("delivered"),
        v.literal("failed"),
      ),
    ),
  },
  returns: pageResult,
  handler: async (ctx, { paginationOpts, status }) => {
    await requireAdmin(ctx);
    const result = status
      ? await ctx.db
          .query("automationEvents")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .paginate(cap(paginationOpts))
      : await ctx.db
          .query("automationEvents")
          .order("desc")
          .paginate(cap(paginationOpts));
    return {
      ...result,
      page: result.page.map((e) => ({
        id: e._id,
        type: e.type,
        status: e.status,
        attempts: e.attemptCount,
        error: e.lastErrorCode ?? null,
        createdAt: e.createdAt,
        deliveredAt: e.deliveredAt ?? null,
      })),
    };
  },
});
