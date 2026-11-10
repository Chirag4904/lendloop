import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

const societies = [
  {
    name: "Demo · Bluebird Residency",
    locality: "Malad East",
    latitude: 19.1930847,
    longitude: 72.8594472,
  },
  {
    name: "Demo · The Courtyard",
    locality: "Malad East",
    latitude: 19.1910847,
    longitude: 72.8624472,
  },
  {
    name: "Demo · Palm Grove",
    locality: "Malad East",
    latitude: 19.1885847,
    longitude: 72.8594472,
  },
  {
    name: "Demo · Sunlit Homes",
    locality: "Malad East",
    latitude: 19.1910847,
    longitude: 72.8559472,
  },
] as const;

const neighbors = ["Asha", "Rohan", "Meera", "Kabir"] as const;

const tools = [
  {
    name: "Demo · Cordless drill",
    category: "Power Tools",
    owner: 0,
    description:
      "Cordless drill with a carry case and bits for shelves and small home repairs. Please return the battery charged.",
  },
  {
    name: "Demo · Garden pruner",
    category: "Garden",
    owner: 1,
    description:
      "Hand pruner for tidying plants and small branches, with a comfortable grip. Please clean the blades after use.",
  },
  {
    name: "Demo · Projector",
    category: "Electronics",
    owner: 2,
    description:
      "Portable projector for a movie night or presentation, with remote and power cable. Bring your own HDMI cable.",
  },
  {
    name: "Demo · Camping tent",
    category: "Camping & Outdoors",
    owner: 3,
    description:
      "Two-person tent with poles, pegs and carry bag for a weekend outdoors. Please dry it fully before returning.",
  },
  {
    name: "Demo · Stand mixer",
    category: "Kitchen",
    owner: 0,
    description:
      "Stand mixer with a mixing bowl and whisk attachment for baking and other kitchen projects. Please wash the attachments after use.",
  },
  {
    name: "Demo · Yoga mat set",
    category: "Sports & Fitness",
    owner: 1,
    description:
      "A pair of comfortable exercise mats with carrying straps for yoga, stretching or a home workout. Wipe clean before returning.",
  },
  {
    name: "Demo · Carpet cleaner",
    category: "Home & Cleaning",
    owner: 2,
    description:
      "Upright carpet cleaner for rugs and upholstery, with a removable water tank. Return the tank empty and rinsed.",
  },
  {
    name: "Demo · Step ladder",
    category: "Other",
    owner: 3,
    description:
      "Folding step ladder for reaching high shelves and light household tasks. Use only on a flat, stable surface.",
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
          city: "Mumbai",
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

export const relocateDemoSocieties = internalMutation({
  args: { societyId: v.id("societies") },
  returns: v.number(),
  handler: async (ctx, { societyId }) => {
    if (process.env.LENDLOOP_DEMO_SEED_ALLOWED !== "true")
      throw new Error("Demo seed is disabled");
    const anchor = await ctx.db.get(societyId);
    if (
      !anchor ||
      anchor.name !== "Rizvi Oak CHSL" ||
      anchor.city !== "Mumbai" ||
      anchor.locality !== "Malad East" ||
      anchor.status !== "active"
    )
      throw new Error("Target society unavailable");
    const offsets = [
      [0.002, 0],
      [0, 0.003],
      [-0.0025, 0],
      [0, -0.0035],
    ] as const;
    let updated = 0;
    for (const [index, name] of neighbors.entries()) {
      const owner = await ctx.db
        .query("users")
        .withIndex("by_clerk_user", (q) =>
          q.eq("clerkUserId", `demo_seed_${name.toLowerCase()}`),
        )
        .unique();
      const society = owner?.societyId && (await ctx.db.get(owner.societyId));
      if (
        !society ||
        society._id === anchor._id ||
        society.name !== societies[index].name
      )
        throw new Error("Expected demo society unavailable");
      const latitude = anchor.latitude + offsets[index][0],
        longitude = anchor.longitude + offsets[index][1];
      if (
        society.city === "Mumbai" &&
        society.locality === "Malad East" &&
        society.latitude === latitude &&
        society.longitude === longitude
      )
        continue;
      await ctx.db.patch(society._id, {
        city: "Mumbai",
        locality: "Malad East",
        latitude,
        longitude,
        updatedAt: Date.now(),
      });
      updated++;
    }
    return updated;
  },
});

const photoKeys = [
  "drill",
  "pruner",
  "projector",
  "tent",
  "mixer",
  "mats",
  "cleaner",
  "ladder",
] as const;

export const prepareDemoPhotos = internalMutation({
  args: {},
  returns: v.array(v.object({ key: v.string(), url: v.string() })),
  handler: async (ctx) => {
    if (process.env.LENDLOOP_DEMO_SEED_ALLOWED !== "true")
      throw new Error("Demo seed is disabled");
    const result = [];
    for (const [index, item] of tools.entries()) {
      const owner = await ctx.db
        .query("users")
        .withIndex("by_clerk_user", (q) =>
          q.eq(
            "clerkUserId",
            `demo_seed_${neighbors[item.owner].toLowerCase()}`,
          ),
        )
        .unique();
      if (!owner) throw new Error("Demo owner unavailable");
      const tool = (
        await ctx.db
          .query("tools")
          .withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
          .take(50)
      ).find((row) => row.name === item.name);
      if (!tool || tool.societyId !== owner.societyId)
        throw new Error("Demo listing unavailable");
      if (!tool.photoIds?.length)
        result.push({
          key: photoKeys[index],
          url: await ctx.storage.generateUploadUrl(),
        });
    }
    return result;
  },
});

export const attachDemoPhotos = internalMutation({
  args: {
    photos: v.array(v.object({ key: v.string(), storageId: v.id("_storage") })),
  },
  returns: v.number(),
  handler: async (ctx, { photos }) => {
    if (process.env.LENDLOOP_DEMO_SEED_ALLOWED !== "true")
      throw new Error("Demo seed is disabled");
    if (
      photos.length > tools.length ||
      new Set(photos.map((p) => p.key)).size !== photos.length
    )
      throw new Error("Invalid photo batch");
    let attached = 0;
    for (const photo of photos) {
      const index = photoKeys.findIndex((key) => key === photo.key);
      if (index < 0) throw new Error("Unknown photo");
      const item = tools[index];
      const owner = await ctx.db
        .query("users")
        .withIndex("by_clerk_user", (q) =>
          q.eq(
            "clerkUserId",
            `demo_seed_${neighbors[item.owner].toLowerCase()}`,
          ),
        )
        .unique();
      if (!owner) throw new Error("Demo owner unavailable");
      const tool = (
        await ctx.db
          .query("tools")
          .withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
          .take(50)
      ).find((row) => row.name === item.name);
      if (!tool || tool.societyId !== owner.societyId)
        throw new Error("Demo listing unavailable");
      if (tool.photoIds?.length) continue;
      const stored = await ctx.db.system.get(photo.storageId);
      if (
        !stored ||
        stored.size === 0 ||
        stored.size > 5_000_000 ||
        stored.contentType !== "image/jpeg"
      )
        throw new Error("Invalid demo image");
      if (
        await ctx.db
          .query("listingPhotos")
          .withIndex("by_storage", (q) => q.eq("storageId", photo.storageId))
          .unique()
      )
        throw new Error("Image already attached");
      const photoId = await ctx.db.insert("listingPhotos", {
        ownerId: owner._id,
        toolId: tool._id,
        storageId: photo.storageId,
        createdAt: Date.now(),
      });
      await ctx.db.patch(tool._id, {
        photoIds: [photoId],
        description: item.description,
        updatedAt: Date.now(),
      });
      attached++;
    }
    return attached;
  },
});
