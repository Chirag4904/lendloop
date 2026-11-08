import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    name: v.string(),
    locality: v.optional(v.string()),
    city: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Authentication required");
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("Profile not found");
    const name = args.name.trim();
    if (name.length < 2 || name.length > 100)
      throw new Error("Society name must be 2–100 characters");
    const locality = args.locality?.trim().slice(0, 100);
    const city = args.city?.trim().slice(0, 100);
    const now = Date.now();
    return ctx.db.insert("societySuggestions", {
      suggestingUserId: user._id,
      name,
      locality,
      city,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});
