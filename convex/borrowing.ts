import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// Calendar dates are interpreted in Asia/Kolkata; both endpoints are inclusive.
export const today = (now = Date.now()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export function days(start: string, end: string, now = Date.now()) {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid dates");
    const time = Date.parse(`${value}T00:00:00Z`);
    if (
      !Number.isFinite(time) ||
      new Date(time).toISOString().slice(0, 10) !== value
    )
      throw new Error("Invalid dates");
    return time;
  };
  const from = parse(start),
    to = parse(end);
  const count = (to - from) / 86_400_000 + 1;
  if (start < today(now) || count < 1 || count > 30)
    throw new Error("Choose 1–30 days, starting today or later");
  return count;
}

export const overlaps = (
  a: { startDate: string; endDate: string },
  b: { startDate: string; endDate: string },
) => a.startDate <= b.endDate && b.startDate <= a.endDate;

export async function currentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Authentication required");
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
    .unique();
  if (!user?.societyId) throw new Error("Choose a society before continuing");
  return user;
}

export async function cover(ctx: QueryCtx, tool: Doc<"tools"> | null) {
  const photo = tool?.photoIds?.[0] ? await ctx.db.get(tool.photoIds[0]) : null;
  return photo && photo.toolId === tool?._id
    ? await ctx.storage.getUrl(photo.storageId)
    : null;
}

export async function loanForRequest(
  ctx: QueryCtx,
  requestId: Id<"borrowRequests">,
) {
  return ctx.db
    .query("loans")
    .withIndex("by_request", (q) => q.eq("requestId", requestId))
    .unique();
}
