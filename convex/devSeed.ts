import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const societies = [
  {
    name: "Demo · Bluebird Residency",
    locality: "Baner",
    latitude: 18.559,
    longitude: 73.786,
  },
  {
    name: "Demo · The Courtyard",
    locality: "Aundh",
    latitude: 18.558,
    longitude: 73.808,
  },
  {
    name: "Demo · Palm Grove",
    locality: "Kothrud",
    latitude: 18.508,
    longitude: 73.807,
  },
  {
    name: "Demo · Sunlit Homes",
    locality: "Viman Nagar",
    latitude: 18.567,
    longitude: 73.914,
  },
] as const;

const neighbors = ["Asha", "Rohan", "Meera", "Kabir"] as const;

const tools = [
  {
    name: "Demo · Cordless drill",
    category: "Power Tools",
    owner: 0,
    description: "A handy drill for shelves and small repairs.",
  },
  {
    name: "Demo · Garden pruner",
    category: "Garden",
    owner: 1,
    description: "For keeping balcony plants in shape.",
  },
  {
    name: "Demo · Projector",
    category: "Electronics",
    owner: 2,
    description: "A little movie night magic.",
  },
  {
    name: "Demo · Camping tent",
    category: "Camping & Outdoors",
    owner: 3,
    description: "A two-person tent for weekend escapes.",
  },
  {
    name: "Demo · Stand mixer",
    category: "Kitchen",
    owner: 0,
    description: "For the big baking days.",
  },
  {
    name: "Demo · Yoga mat set",
    category: "Sports & Fitness",
    owner: 1,
    description: "Two mats for a shared practice.",
  },
  {
    name: "Demo · Carpet cleaner",
    category: "Home & Cleaning",
    owner: 2,
    description: "A deep clean without buying a machine.",
  },
  {
    name: "Demo · Step ladder",
    category: "Other",
    owner: 3,
    description: "Reach the top shelf safely.",
  },
] as const;

export const seed = internalMutation({
  args: {},
  returns: v.object({
    societies: v.number(),
    users: v.number(),
    tools: v.number(),
  }),
  handler: async (ctx) => {
    if (process.env.LENDLOOP_DEMO_SEED_ALLOWED !== "true")
      throw new Error("Demo seed is disabled for this deployment");
    // shortcut: insert-only seed; remove its demo rows before reseeding after manual edits.
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", "demo_seed_asha"))
      .unique();
    if (existing) return { societies: 0, users: 0, tools: 0 };

    const now = Date.now();
    const societyIds = [];
    for (const society of societies) {
      societyIds.push(
        await ctx.db.insert("societies", {
          ...society,
          city: "Pune",
          status: "active",
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    const ownerIds = [];
    for (const [index, name] of neighbors.entries()) {
      ownerIds.push(
        await ctx.db.insert("users", {
          clerkUserId: `demo_seed_${name.toLowerCase()}`,
          displayName: `Demo · ${name}`,
          societyId: societyIds[index],
          role: "user",
          trustedLender: false,
          trustedBorrower: false,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }
    for (const tool of tools) {
      await ctx.db.insert("tools", {
        ownerId: ownerIds[tool.owner],
        societyId: societyIds[tool.owner],
        name: tool.name,
        category: tool.category,
        condition: "good",
        description: tool.description,
        active: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    return {
      societies: societies.length,
      users: neighbors.length,
      tools: tools.length,
    };
  },
});
