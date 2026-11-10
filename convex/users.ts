import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function authenticatedClerkId(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  return identity.subject;
}

async function saveEmail(ctx: MutationCtx, userId: Id<"users">, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 254) throw new Error("Invalid email");
  const existing = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", normalized))
    .unique();
  if (existing && existing._id !== userId)
    throw new Error("Email already belongs to another user");
  await ctx.db.patch(userId, { email: normalized });
}

export const me = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await authenticatedClerkId(ctx);
    return ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
  },
});

export const ensureCurrent = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, { displayName }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");
    const clerkUserId = identity.subject;
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (existing) {
      if (!existing.email && identity.email && identity.emailVerified === true)
        await saveEmail(ctx, existing._id, identity.email);
      return existing._id;
    }
    const now = Date.now();
    const id = await ctx.db.insert("users", {
      clerkUserId,
      displayName: displayName.trim().slice(0, 80) || "Neighbor",
      role: "user",
      trustedLender: false,
      trustedBorrower: false,
      createdAt: now,
      updatedAt: now,
    });
    if (identity.email && identity.emailVerified === true)
      await saveEmail(ctx, id, identity.email);
    return id;
  },
});

// Deployment operators can backfill verified primary emails from Clerk.
export const backfillEmail = internalMutation({
  args: { clerkUserId: v.string(), email: v.string() },
  returns: v.union(
    v.literal("saved"),
    v.literal("unchanged"),
    v.literal("missing"),
  ),
  handler: async (ctx, { clerkUserId, email }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (!user) return "missing";
    if (user.email) return "unchanged";
    await saveEmail(ctx, user._id, email);
    return "saved";
  },
});

export const updateProfile = mutation({
  args: { displayName: v.string() },
  handler: async (ctx, { displayName }) => {
    const clerkUserId = await authenticatedClerkId(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (!user) throw new Error("Profile not found");
    const name = displayName.trim();
    if (!name || name.length > 80)
      throw new Error("Name must be 1–80 characters");
    await ctx.db.patch(user._id, { displayName: name, updatedAt: Date.now() });
  },
});

export const selectSociety = mutation({
  args: { societyId: v.id("societies") },
  handler: async (ctx, { societyId }) => {
    const clerkUserId = await authenticatedClerkId(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (!user) throw new Error("Profile not found");
    const society = await ctx.db.get(societyId);
    if (!society || society.status !== "active")
      throw new Error("Society unavailable");
    await ctx.db.patch(user._id, { societyId, updatedAt: Date.now() });
  },
});
