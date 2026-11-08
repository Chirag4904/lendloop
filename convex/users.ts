import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

async function authenticatedClerkId(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  return identity.subject;
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
    const clerkUserId = await authenticatedClerkId(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (existing) return existing._id;
    const now = Date.now();
    return ctx.db.insert("users", {
      clerkUserId,
      displayName: displayName.trim().slice(0, 80) || "Neighbor",
      role: "user",
      trustedLender: false,
      trustedBorrower: false,
      createdAt: now,
      updatedAt: now,
    });
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
