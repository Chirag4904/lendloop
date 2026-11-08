import { query } from "./_generated/server";
import { v } from "convex/values";

export const search = query({
  args: { term: v.string() },
  handler: async (ctx, { term }) => {
    // shortcut: searches the first 200 active societies; add a search index when the directory grows.
    const societies = await ctx.db
      .query("societies")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .take(200);
    const needle = term.trim().toLocaleLowerCase();
    return societies
      .filter((s) =>
        `${s.name} ${s.locality} ${s.city}`
          .toLocaleLowerCase()
          .includes(needle),
      )
      .slice(0, 20)
      .map((s) => ({
        _id: s._id,
        name: s.name,
        locality: s.locality,
        city: s.city,
      }));
  },
});
