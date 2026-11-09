import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { hmac } from "./signing";

export const send = internalAction({
  args: { eventId: v.id("automationEvents") },
  returns: v.null(),
  handler: async (ctx, { eventId }) => {
    const lease = crypto.randomUUID();
    const event = await ctx.runMutation(internal.automation.claimEvent, {
      eventId,
      lease,
    });
    if (!event) return null;
    let code = "transport_error";
    try {
      const target = process.env.LENDLOOP_N8N_WEBHOOK_URL;
      const secret = process.env.LENDLOOP_OUTBOUND_SECRET;
      if (!target?.startsWith("https://") || !secret)
        throw new Error("automation_configuration_missing");
      const url = new URL(target);
      if (url.search) throw new Error("automation_configuration_missing");
      const body = JSON.stringify({
        eventId,
        type: event.type,
        recipientUserId: event.recipientUserId,
        requestId: event.requestId,
        toolName: event.toolName,
        lease,
      });
      const timestamp = String(Date.now()),
        nonce = crypto.randomUUID();
      const signature = await hmac(
        secret,
        "POST",
        url.pathname + url.search,
        timestamp,
        nonce,
        body,
      );
      const response = await fetch(target, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lendloop-timestamp": timestamp,
          "x-lendloop-nonce": nonce,
          "x-lendloop-signature": signature,
        },
        body,
      });
      if (
        response.ok &&
        (await ctx.runQuery(internal.automation.eventDelivered, { eventId }))
      )
        return null;
      code =
        response.status === 401 || response.status === 403
          ? "authentication_failed"
          : `http_${response.status}`;
    } catch (error) {
      code =
        error instanceof Error &&
        error.message === "automation_configuration_missing"
          ? error.message
          : "transport_error";
    }
    await ctx.runMutation(internal.automation.dispatchFailed, {
      eventId,
      lease,
      code,
    });
    return null;
  },
});
