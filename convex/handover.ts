import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { currentUser } from "./borrowing";

const fields = {
  phone: v.string(),
  pickupPoint: v.string(),
  instructions: v.string(),
  returnInstructions: v.string(),
};

export const mine = query({
  args: {},
  returns: v.union(v.object(fields), v.null()),
  handler: async (ctx) => {
    const user = await currentUser(ctx);
    const details = await ctx.db
      .query("savedHandoverDetails")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    return details
      ? {
          phone: details.phone,
          pickupPoint: details.pickupPoint,
          instructions: details.instructions,
          returnInstructions: details.returnInstructions,
        }
      : null;
  },
});

export const save = mutation({
  args: fields,
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await currentUser(ctx);
    const details = {
      phone: args.phone.trim(),
      pickupPoint: args.pickupPoint.trim(),
      instructions: args.instructions.trim(),
      returnInstructions: args.returnInstructions.trim(),
    };
    if (
      (details.phone && !/^\+?[0-9 ()-]{7,20}$/.test(details.phone)) ||
      details.pickupPoint.length > 200 ||
      details.instructions.length > 500 ||
      details.returnInstructions.length > 500
    )
      throw new Error("Check the handover details and try again");
    const existing = await ctx.db
      .query("savedHandoverDetails")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .unique();
    if (existing) await ctx.db.patch(existing._id, details);
    else
      await ctx.db.insert("savedHandoverDetails", {
        userId: user._id,
        ...details,
      });
    return null;
  },
});
