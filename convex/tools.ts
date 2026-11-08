import { query } from "./_generated/server";

export const publicList = query({
  args: {},
  handler: async (ctx) => {
    // shortcut: the landing page previews 24 tools; add pagination with the full browse experience.
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(24);
    return tools.map(({ name, category }) => ({ name, category }));
  },
});
