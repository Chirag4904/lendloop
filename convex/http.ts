import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { verify } from "./signing";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();
const json = (value: unknown, status = 200) => Response.json(value, { status });

async function authenticated(ctx: ActionCtx, request: Request, body: string) {
  const secret = process.env.LENDLOOP_INBOUND_SECRET;
  if (!secret || !(await verify(secret, request, body))) return false;
  const nonce = request.headers.get("x-lendloop-nonce")!;
  return ctx.runMutation(internal.automation.useNonce, { nonce });
}

http.route({
  path: "/automation/overdue-loans",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    if (!(await authenticated(ctx, request, "")))
      return json({ error: "unauthorized" }, 401);
    const cursor = new URL(request.url).searchParams.get("cursor") ?? undefined;
    return json(
      await ctx.runQuery(internal.automation.overduePage, { cursor }),
    );
  }),
});

http.route({
  path: "/automation/reminders/claim",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    if (!(await authenticated(ctx, request, body)))
      return json({ error: "unauthorized" }, 401);
    try {
      const data = JSON.parse(body);
      if (
        typeof data.loanId !== "string" ||
        typeof data.lease !== "string" ||
        data.lease.length > 100
      )
        return json({ error: "invalid_request" }, 400);
      const claim = await ctx.runMutation(internal.automation.claimReminder, {
        loanId: data.loanId as Id<"loans">,
        lease: data.lease,
      });
      return json({ claim });
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
  }),
});

http.route({
  path: "/automation/reminders/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    if (!(await authenticated(ctx, request, body)))
      return json({ error: "unauthorized" }, 401);
    try {
      const data = JSON.parse(body);
      if (
        typeof data.key !== "string" ||
        !/^overdue:[^:]+:\d{4}-\d{2}-\d{2}$/.test(data.key) ||
        typeof data.lease !== "string" ||
        typeof data.success !== "boolean"
      )
        return json({ error: "invalid_request" }, 400);
      return json({
        completed: await ctx.runMutation(
          internal.automation.completeReminder,
          data,
        ),
      });
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
  }),
});

http.route({
  path: "/automation/events/complete",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    if (!(await authenticated(ctx, request, body)))
      return json({ error: "unauthorized" }, 401);
    try {
      const data = JSON.parse(body);
      if (
        typeof data.eventId !== "string" ||
        typeof data.lease !== "string" ||
        typeof data.message !== "string"
      )
        return json({ error: "invalid_request" }, 400);
      return json({
        completed: await ctx.runMutation(internal.automation.deliverEvent, {
          eventId: data.eventId as Id<"automationEvents">,
          lease: data.lease,
          message: data.message,
        }),
      });
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
  }),
});

export default http;
