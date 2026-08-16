import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

type PolarWebhook = {
  type?: string;
  data?: {
    id?: string;
    customer?: { external_id?: string };
    metadata?: { clerkUserId?: string };
  };
};

function clerkUserIdFrom(payload: PolarWebhook): string | undefined {
  const data = payload.data;
  return data?.customer?.external_id || data?.metadata?.clerkUserId;
}

const http = httpRouter();

http.route({
  path: "/polar/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.POLAR_WEBHOOK_SECRET;
    if (!secret) {
      return new Response(JSON.stringify({ stub: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let payload: PolarWebhook;
    try {
      payload = (await request.json()) as PolarWebhook;
    } catch {
      return new Response("invalid json", { status: 400 });
    }

    const clerkUserId = clerkUserIdFrom(payload);
    if (!clerkUserId) {
      return new Response(JSON.stringify({ ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const type = payload.type ?? "";
    const polarOrderId = payload.data?.id;
    if (type === "order.paid") {
      await ctx.runMutation(internal.entitlements.upsertFromPolar, {
        clerkUserId,
        status: "active",
        period: "2026",
        polarOrderId,
      });
    } else if (type === "order.refunded") {
      await ctx.runMutation(internal.entitlements.upsertFromPolar, {
        clerkUserId,
        status: "revoked",
        period: "2026",
        polarOrderId,
      });
    } else {
      return new Response(JSON.stringify({ ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
