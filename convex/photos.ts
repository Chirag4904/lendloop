import { v } from "convex/values";
import { internalMutation, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";

async function current(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  const me = await ctx.db
    .query("users")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!me?.societyId) throw new Error("Choose a society before continuing");
  return me;
}

export const uploadUrl = mutation({
  args: { sha256: v.string() },
  returns: v.object({ url: v.string(), ticketId: v.id("uploadTickets") }),
  handler: async (ctx, { sha256 }) => {
    const me = await current(ctx);
    if (!/^[A-Za-z0-9+/]{43}=$/.test(sha256))
      throw new Error("Invalid image fingerprint");
    const ticketId = await ctx.db.insert("uploadTickets", {
      ownerId: me._id,
      sha256,
      createdAt: Date.now(),
    });
    return { url: await ctx.storage.generateUploadUrl(), ticketId };
  },
});
export const register = mutation({
  args: { ticketId: v.id("uploadTickets"), storageId: v.id("_storage") },
  returns: v.id("listingPhotos"),
  handler: async (ctx, { ticketId, storageId }) => {
    const me = await current(ctx),
      ticket = await ctx.db.get(ticketId);
    if (
      !ticket ||
      ticket.ownerId !== me._id ||
      Date.now() - ticket.createdAt > 10 * 60_000
    )
      throw new Error("Upload expired; try again");
    const existing = await ctx.db
      .query("listingPhotos")
      .withIndex("by_storage", (q) => q.eq("storageId", storageId))
      .unique();
    if (existing) throw new Error("Image already registered");
    const stored = await ctx.db.system.get(storageId);
    if (
      !stored ||
      stored._creationTime < ticket.createdAt - 1000 ||
      stored.sha256 !== ticket.sha256
    )
      throw new Error("Upload unavailable; retry");
    if (
      stored.size > 5_000_000 ||
      stored.size === 0 ||
      !["image/jpeg", "image/png", "image/webp"].includes(
        stored.contentType ?? "",
      )
    )
      throw new Error("Use a JPEG, PNG or WebP image under 5 MB");
    const blob = await ctx.storage.get(storageId);
    if (!blob) throw new Error("Image unavailable");
    const bytes = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
    const tail = new Uint8Array(await blob.slice(-12).arrayBuffer());
    const jpeg =
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff &&
      tail.at(-2) === 0xff &&
      tail.at(-1) === 0xd9;
    const png =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      String.fromCharCode(...tail.slice(4, 8)) === "IEND";
    const webp =
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" &&
      new DataView(bytes.buffer).getUint32(4, true) === blob.size - 8;
    if (!(
      (stored.contentType === "image/jpeg" && jpeg) ||
      (stored.contentType === "image/png" && png) ||
      (stored.contentType === "image/webp" && webp)
    ))
      throw new Error("Image contents do not match its format");
    const unassigned = await ctx.db
      .query("listingPhotos")
      .withIndex("by_owner_and_tool", (q) =>
        q.eq("ownerId", me._id).eq("toolId", undefined),
      )
      .take(5);
    if (unassigned.length >= 5)
      throw new Error("Attach or remove photos before adding more");
    await ctx.db.delete(ticketId);
    return ctx.db.insert("listingPhotos", {
      ownerId: me._id,
      storageId,
      createdAt: Date.now(),
    });
  },
});
export const setForTool = mutation({
  args: { toolId: v.id("tools"), photoIds: v.array(v.id("listingPhotos")) },
  returns: v.null(),
  handler: async (ctx, { toolId, photoIds }) => {
    const me = await current(ctx),
      tool = await ctx.db.get(toolId);
    if (!tool || tool.ownerId !== me._id || tool.archived)
      throw new Error("Listing unavailable");
    if (photoIds.length > 5 || new Set(photoIds).size !== photoIds.length)
      throw new Error("Choose up to five distinct photos");
    const photos = await Promise.all(photoIds.map((id) => ctx.db.get(id)));
    if (
      photos.some(
        (p) => !p || p.ownerId !== me._id || (p.toolId && p.toolId !== toolId),
      )
    )
      throw new Error("Photo unavailable");
    const removed = (tool.photoIds ?? []).filter(
      (id) => !photoIds.includes(id),
    );
    await ctx.db.patch(toolId, { photoIds, updatedAt: Date.now() });
    for (const photo of photos)
      if (photo && !photo.toolId) await ctx.db.patch(photo._id, { toolId });
    for (const id of removed) {
      const photo = await ctx.db.get(id);
      if (photo?.toolId === toolId) {
        await ctx.storage.delete(photo.storageId);
        await ctx.db.delete(id);
      }
    }
    return null;
  },
});
export const cleanup = internalMutation({
  args: { cursor: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { cursor }) => {
    const page = await ctx.db.system
      .query("_storage")
      .paginate({ numItems: 100, cursor: cursor ?? null });
    for (const file of page.page) {
      if (Date.now() - file._creationTime < 48 * 60 * 60_000) continue;
      const photo = await ctx.db
        .query("listingPhotos")
        .withIndex("by_storage", (q) => q.eq("storageId", file._id))
        .unique();
      if (!photo) await ctx.storage.delete(file._id);
      else if (
        !photo.toolId &&
        Date.now() - photo.createdAt > 48 * 60 * 60_000
      ) {
        await ctx.storage.delete(file._id);
        await ctx.db.delete(photo._id);
      }
    }
    if (!page.isDone)
      await ctx.scheduler.runAfter(0, internal.photos.cleanup, {
        cursor: page.continueCursor,
      });
    return null;
  },
});
export const cleanupTickets = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const old = await ctx.db
      .query("uploadTickets")
      .withIndex("by_created_at", (q) =>
        q.lt("createdAt", Date.now() - 48 * 60 * 60_000),
      )
      .take(100);
    for (const ticket of old) await ctx.db.delete(ticket._id);
    if (old.length === 100)
      await ctx.scheduler.runAfter(0, internal.photos.cleanupTickets, {});
    return null;
  },
});
