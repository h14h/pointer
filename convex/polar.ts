import { action } from "./_generated/server";
import { v } from "convex/values";

function polarBaseUrl(): string {
  return process.env.POLAR_SERVER === "sandbox"
    ? "https://sandbox-api.polar.sh"
    : "https://api.polar.sh";
}

export const startCheckout = action({
  args: { successUrl: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const token = process.env.POLAR_ACCESS_TOKEN;
    const productId = process.env.POLAR_PRODUCT_ID;
    if (!token || !productId) {
      throw new Error("payments_not_configured");
    }

    const response = await fetch(`${polarBaseUrl()}/v1/checkouts/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        products: [productId],
        customer_external_id: identity.subject,
        success_url: args.successUrl,
        metadata: { clerkUserId: identity.subject },
      }),
    });

    if (!response.ok) {
      throw new Error("payments_not_configured");
    }

    const data = (await response.json()) as { url?: string };
    if (!data.url) {
      throw new Error("payments_not_configured");
    }
    return { url: data.url };
  },
});
