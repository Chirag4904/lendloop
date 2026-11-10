import { v } from "convex/values";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { toolCategories } from "./schema";
import { cover } from "./borrowing";

const condition = v.union(
  v.literal("likeNew"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("wellUsed"),
);
const fields = {
  name: v.string(),
  category: toolCategories,
  condition,
  description: v.string(),
  dailyAmount: v.optional(v.number()),
};
const toolView = v.object({
  id: v.id("tools"),
  name: v.string(),
  category: toolCategories,
  condition: v.union(condition, v.literal("new")),
  description: v.string(),
  dailyAmount: v.union(v.number(), v.null()),
  active: v.boolean(),
  archived: v.boolean(),
  distanceMeters: v.number(),
  ownerName: v.string(),
  isOwner: v.boolean(),
  trustedLender: v.boolean(),
  photos: v.array(
    v.object({ id: v.id("listingPhotos"), url: v.union(v.string(), v.null()) }),
  ),
});

async function user(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  const record = await ctx.db
    .query("users")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!record?.societyId) throw new Error("Choose a society before continuing");
  return record;
}
function validate(input: {
  name: string;
  description: string;
  dailyAmount?: number;
}) {
  if (!input.name.trim() || input.name.trim().length > 80)
    throw new Error("Name must be 1–80 characters");
  if (!input.description.trim() || input.description.trim().length > 1000)
    throw new Error("Description must be 1–1000 characters");
  if (
    input.dailyAmount !== undefined &&
    (!Number.isSafeInteger(input.dailyAmount) ||
      input.dailyAmount < 100 ||
      input.dailyAmount > 1_000_000)
  )
    throw new Error("Daily price must be ₹1–₹10,000");
}
async function ownerTool(ctx: MutationCtx, toolId: Id<"tools">) {
  const me = await user(ctx);
  const tool = await ctx.db.get(toolId);
  if (!tool || tool.ownerId !== me._id) throw new Error("Listing unavailable");
  return tool;
}
async function view(
  ctx: QueryCtx,
  tool: Doc<"tools">,
  distance: number,
  viewerId: Id<"users">,
) {
  const owner = await ctx.db.get(tool.ownerId);
  const photos = await Promise.all(
    (tool.photoIds ?? []).map(async (id) => {
      const photo = await ctx.db.get(id);
      return photo?.toolId === tool._id
        ? { id, url: await ctx.storage.getUrl(photo.storageId) }
        : null;
    }),
  );
  return {
    id: tool._id,
    name: tool.name,
    category: tool.category,
    condition: tool.condition,
    description: tool.description,
    dailyAmount: tool.pricing?.dailyAmount ?? null,
    active: tool.active,
    archived: tool.archived ?? false,
    distanceMeters: Number.isFinite(distance) ? Math.round(distance) : -1,
    ownerName: owner?.displayName ?? "Neighbor",
    isOwner: tool.ownerId === viewerId,
    trustedLender: owner?.trustedLender ?? false,
    photos: photos.filter(
      (photo): photo is { id: Id<"listingPhotos">; url: string | null } =>
        Boolean(photo),
    ),
  };
}
function meters(a: Doc<"societies">, b: Doc<"societies">) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad,
    dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) *
      Math.cos(b.latitude * rad) *
      Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const publicList = query({
  args: {},
  returns: v.array(v.object({ name: v.string(), category: toolCategories })),
  handler: async (ctx) =>
    (
      await ctx.db
        .query("tools")
        .withIndex("by_active", (q) => q.eq("active", true))
        .take(100)
    )
      .filter((t) => !t.archived)
      .slice(0, 24)
      .map(({ name, category }) => ({ name, category })),
});
export const publicBrowse = query({
  args: {
    text: v.string(),
    category: v.optional(toolCategories),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(
    v.object({
      name: v.string(),
      category: toolCategories,
      photoUrl: v.union(v.string(), v.null()),
    }),
  ),
  handler: async (ctx, { text, category, paginationOpts }) => {
    const term = text.trim();
    if (term.length > 80)
      throw new Error("Search must be 80 characters or fewer");
    if (paginationOpts.numItems < 1 || paginationOpts.numItems > 50)
      throw new Error("Choose up to 50 listings per page");
    const source = ctx.db.query("tools");
    const search = term
      ? source.withSearchIndex("search_name", (q) => {
          const filter = q.search("name", term).eq("active", true);
          return category ? filter.eq("category", category) : filter;
        })
      : category
        ? source
            .withIndex("by_active_and_category", (q) =>
              q.eq("active", true).eq("category", category),
            )
            .order("desc")
        : source
            .withIndex("by_active", (q) => q.eq("active", true))
            .order("desc");
    const page = await search.paginate(paginationOpts);
    return {
      ...page,
      page: await Promise.all(
        page.page
          .filter((tool) => !tool.archived)
          .map(async (tool) => ({
            name: tool.name,
            category: tool.category,
            photoUrl: await cover(ctx, tool),
          })),
      ),
    };
  },
});
export const mine = query({
  args: {},
  returns: v.array(toolView),
  handler: async (ctx) => {
    const me = await user(ctx);
    const rows = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", me._id))
      .order("desc")
      .take(100);
    const home = await ctx.db.get(me.societyId!);
    return Promise.all(
      rows.map(async (t) => {
        const society = await ctx.db.get(t.societyId);
        return view(
          ctx,
          t,
          t.societyId === me.societyId
            ? 0
            : home && society
              ? meters(home, society)
              : -1,
          me._id,
        );
      }),
    );
  },
});
export const create = mutation({
  args: fields,
  returns: v.id("tools"),
  handler: async (ctx, args) => {
    const me = await user(ctx);
    validate(args);
    const society = await ctx.db.get(me.societyId!);
    if (society?.status !== "active") throw new Error("Society unavailable");
    const now = Date.now();
    return ctx.db.insert("tools", {
      ownerId: me._id,
      societyId: society._id,
      name: args.name.trim(),
      category: args.category,
      condition: args.condition,
      description: args.description.trim(),
      pricing:
        args.dailyAmount === undefined
          ? undefined
          : { dailyAmount: args.dailyAmount, currency: "INR" },
      active: false,
      createdAt: now,
      updatedAt: now,
    });
  },
});
export const update = mutation({
  args: { toolId: v.id("tools"), ...fields },
  returns: v.null(),
  handler: async (ctx, { toolId, ...args }) => {
    const tool = await ownerTool(ctx, toolId);
    validate(args);
    if (tool.archived) throw new Error("Archived listings cannot be edited");
    await ctx.db.patch(toolId, {
      name: args.name.trim(),
      category: args.category,
      condition: args.condition,
      description: args.description.trim(),
      pricing:
        args.dailyAmount === undefined
          ? undefined
          : { dailyAmount: args.dailyAmount, currency: "INR" },
      updatedAt: Date.now(),
    });
    return null;
  },
});
export const setStatus = mutation({
  args: {
    toolId: v.id("tools"),
    status: v.union(
      v.literal("active"),
      v.literal("unlisted"),
      v.literal("archived"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { toolId, status }) => {
    const tool = await ownerTool(ctx, toolId);
    if (tool.archived) throw new Error("Archived listings cannot be changed");
    await ctx.db.patch(toolId, {
      active: status === "active",
      archived: status === "archived",
      updatedAt: Date.now(),
    });
    return null;
  },
});
export const explore = query({
  args: {
    scope: v.union(v.literal("society"), v.literal("500"), v.literal("1000")),
    text: v.string(),
    category: v.optional(toolCategories),
    price: v.union(v.literal("all"), v.literal("free"), v.literal("paid")),
    sort: v.union(
      v.literal("nearest"),
      v.literal("newest"),
      v.literal("price"),
    ),
  },
  returns: v.array(toolView),
  handler: async (ctx, args) => {
    const me = await user(ctx),
      home = await ctx.db.get(me.societyId!);
    if (!home) return [];
    // shortcut: first 200 active societies and 40 listings per society; add a geospatial index and pagination as the directory grows.
    const societies = [
      home,
      ...(args.scope === "society"
        ? []
        : (
            await ctx.db
              .query("societies")
              .withIndex("by_status", (q) => q.eq("status", "active"))
              .take(200)
          ).filter((s) => s._id !== home._id)),
    ];
    const radius =
      args.scope === "500" ? 500 : args.scope === "1000" ? 1000 : 0;
    const nearby = societies.filter(
      (s) =>
        s._id === home._id ||
        (Number.isFinite(s.latitude) &&
          Number.isFinite(s.longitude) &&
          meters(home, s) <= radius),
    );
    const rows = (
      await Promise.all(
        nearby.map(async (s) => ({
          distance: s._id === home._id ? 0 : meters(home, s),
          tools: await ctx.db
            .query("tools")
            .withIndex("by_society_active", (q) =>
              q.eq("societyId", s._id).eq("active", true),
            )
            .take(40),
        })),
      )
    ).flatMap(({ distance, tools }) =>
      tools.map((tool) => ({ tool, distance })),
    );
    const text = args.text.trim().toLocaleLowerCase();
    const filtered = rows.filter(
      ({ tool }) =>
        !tool.archived &&
        (!args.category || tool.category === args.category) &&
        (args.price === "all" || (args.price === "free") === !tool.pricing) &&
        (!text ||
          `${tool.name} ${tool.description} ${tool.category}`
            .toLocaleLowerCase()
            .includes(text)),
    );
    filtered.sort((a, b) => {
      if ((a.distance === 0) !== (b.distance === 0))
        return a.distance === 0 ? -1 : 1;
      return args.sort === "price"
        ? (a.tool.pricing?.dailyAmount ?? 0) -
            (b.tool.pricing?.dailyAmount ?? 0) || a.distance - b.distance
        : args.sort === "newest"
          ? b.tool.createdAt - a.tool.createdAt
          : a.distance - b.distance || b.tool.createdAt - a.tool.createdAt;
    });
    return Promise.all(
      filtered
        .slice(0, 100)
        .map(({ tool, distance }) => view(ctx, tool, distance, me._id)),
    );
  },
});
export const detail = query({
  args: { toolId: v.id("tools") },
  returns: v.union(toolView, v.null()),
  handler: async (ctx, { toolId }) => {
    const me = await user(ctx),
      tool = await ctx.db.get(toolId);
    if (!tool || ((tool.archived || !tool.active) && tool.ownerId !== me._id))
      return null;
    const home = await ctx.db.get(me.societyId!),
      society = await ctx.db.get(tool.societyId);
    return view(
      ctx,
      tool,
      tool.societyId === me.societyId
        ? 0
        : home && society
          ? meters(home, society)
          : -1,
      me._id,
    );
  },
});
