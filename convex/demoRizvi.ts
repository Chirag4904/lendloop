import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const people = ["Nisha", "Aditya", "Farah", "Vikram"] as const;
const items = [
  {
    key: "drill",
    name: "Demo · Cordless drill kit",
    category: "Power Tools",
    condition: "good",
    description:
      "Cordless drill, spare battery and carry case. Handy for shelves and small home repairs.",
    owner: 0,
    dailyAmount: 15000,
  },
  {
    key: "mixer",
    name: "Demo · Stand mixer",
    category: "Kitchen",
    condition: "likeNew",
    description:
      "Stand mixer with stainless steel bowl and whisk attachment. Great for weekend baking.",
    owner: 0,
    dailyAmount: 12000,
  },
  {
    key: "pruner",
    name: "Demo · Garden pruner",
    category: "Garden",
    condition: "good",
    description:
      "Sharp hand pruner with gardening gloves for balcony plants. Please clean after use.",
    owner: 1,
  },
  {
    key: "mats",
    name: "Demo · Yoga mat pair",
    category: "Sports & Fitness",
    condition: "good",
    description:
      "Two comfortable yoga mats with carrying straps. Free to borrow for a class or weekend.",
    owner: 1,
  },
  {
    key: "projector",
    name: "Demo · Portable projector",
    category: "Electronics",
    condition: "good",
    description:
      "Compact projector and remote for movie nights. Bring your own HDMI cable.",
    owner: 2,
    dailyAmount: 25000,
  },
  {
    key: "cleaner",
    name: "Demo · Carpet cleaner",
    category: "Home & Cleaning",
    condition: "fair",
    description:
      "Upright carpet cleaner for rugs and upholstery. Return the tank emptied and rinsed.",
    owner: 2,
    dailyAmount: 18000,
  },
  {
    key: "tent",
    name: "Demo · Two-person tent",
    category: "Camping & Outdoors",
    condition: "good",
    description:
      "Two-person tent with poles, pegs and carry bag. Dry fully before returning.",
    owner: 3,
    dailyAmount: 20000,
  },
  {
    key: "ladder",
    name: "Demo · Aluminum step ladder",
    category: "Other",
    condition: "good",
    description:
      "Sturdy folding step ladder for reaching shelves and ceiling fixtures. Use on level ground.",
    owner: 3,
  },
] as const;

async function target(ctx: MutationCtx, societyId: Id<"societies">) {
  if (process.env.LENDLOOP_DEMO_SEED_ALLOWED !== "true")
    throw new Error("Demo seed is disabled");
  const society = await ctx.db.get(societyId);
  if (
    society?.name !== "Rizvi Oak CHSL" ||
    society.city !== "Mumbai" ||
    society.locality !== "Malad East" ||
    society.status !== "active"
  )
    throw new Error("Target society unavailable");
  return society;
}

export const seed = internalMutation({
  args: { societyId: v.id("societies") },
  returns: v.object({ users: v.number(), tools: v.number() }),
  handler: async (ctx, { societyId }) => {
    await target(ctx, societyId);
    const now = Date.now();
    const ownerIds = [];
    let users = 0,
      tools = 0;
    for (const name of people) {
      const clerkUserId = `demo_rizvi_${name.toLowerCase()}`;
      const existing = await ctx.db
        .query("users")
        .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
        .unique();
      if (existing && existing.societyId !== societyId)
        throw new Error("Demo profile belongs to another society");
      ownerIds.push(
        existing?._id ??
          (await ctx.db.insert("users", {
            clerkUserId,
            displayName: `Demo · ${name}`,
            societyId,
            role: "user",
            trustedLender: false,
            trustedBorrower: false,
            createdAt: now,
            updatedAt: now,
          })),
      );
      if (!existing) users++;
    }
    for (const item of items) {
      const ownerId = ownerIds[item.owner];
      const existing = (
        await ctx.db
          .query("tools")
          .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
          .take(50)
      ).find((tool) => tool.name === item.name);
      if (existing) continue;
      await ctx.db.insert("tools", {
        ownerId,
        societyId,
        name: item.name,
        category: item.category,
        condition: item.condition,
        description: item.description,
        active: true,
        pricing:
          "dailyAmount" in item
            ? { dailyAmount: item.dailyAmount, currency: "INR" }
            : undefined,
        createdAt: now,
        updatedAt: now,
      });
      tools++;
    }
    return { users, tools };
  },
});

export const preparePhotos = internalMutation({
  args: { societyId: v.id("societies") },
  returns: v.array(v.object({ key: v.string(), url: v.string() })),
  handler: async (ctx, { societyId }) => {
    await target(ctx, societyId);
    const rows = await ctx.db
      .query("tools")
      .withIndex("by_society_active", (q) =>
        q.eq("societyId", societyId).eq("active", true),
      )
      .take(100);
    const result = [];
    for (const item of items) {
      const tool = rows.find((row) => row.name === item.name);
      if (!tool) throw new Error("Seed listings are missing");
      if ((tool.photoIds?.length ?? 0) === 0)
        result.push({
          key: item.key,
          url: await ctx.storage.generateUploadUrl(),
        });
    }
    return result;
  },
});

export const attachPhotos = internalMutation({
  args: {
    societyId: v.id("societies"),
    photos: v.array(v.object({ key: v.string(), storageId: v.id("_storage") })),
  },
  returns: v.number(),
  handler: async (ctx, { societyId, photos }) => {
    await target(ctx, societyId);
    if (
      photos.length > items.length ||
      new Set(photos.map((photo) => photo.key)).size !== photos.length
    )
      throw new Error("Invalid photo batch");
    const rows = await ctx.db
      .query("tools")
      .withIndex("by_society_active", (q) =>
        q.eq("societyId", societyId).eq("active", true),
      )
      .take(100);
    let attached = 0;
    for (const photo of photos) {
      const item = items.find((item) => item.key === photo.key);
      const tool = item && rows.find((row) => row.name === item.name);
      if (!tool) throw new Error("Seed listing unavailable");
      if ((tool.photoIds?.length ?? 0) > 0) continue;
      const owner = await ctx.db.get(tool.ownerId);
      if (!owner?.clerkUserId.startsWith("demo_rizvi_"))
        throw new Error("Unexpected owner");
      const stored = await ctx.db.system.get(photo.storageId);
      if (
        !stored ||
        stored.size === 0 ||
        stored.size > 5_000_000 ||
        stored.contentType !== "image/jpeg"
      )
        throw new Error("Invalid demo image");
      const claimed = await ctx.db
        .query("listingPhotos")
        .withIndex("by_storage", (q) => q.eq("storageId", photo.storageId))
        .unique();
      if (claimed) throw new Error("Image already attached");
      const photoId = await ctx.db.insert("listingPhotos", {
        ownerId: tool.ownerId,
        toolId: tool._id,
        storageId: photo.storageId,
        createdAt: Date.now(),
      });
      await ctx.db.patch(tool._id, {
        photoIds: [photoId],
        updatedAt: Date.now(),
      });
      attached++;
    }
    return attached;
  },
});
