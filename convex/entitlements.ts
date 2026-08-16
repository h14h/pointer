import { internalMutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function entitlementFor(
  ctx: QueryCtx | MutationCtx,
  clerkUserId: string,
) {
  return await ctx.db
    .query("entitlements")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", clerkUserId))
    .unique();
}

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await entitlementFor(ctx, identity.subject);
  },
});

export const upsertFromPolar = internalMutation({
  args: {
    clerkUserId: v.string(),
    status: v.string(),
    period: v.string(),
    polarOrderId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await entitlementFor(ctx, args.clerkUserId);
    const patch = {
      status: args.status,
      period: args.period,
      polarOrderId: args.polarOrderId,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("entitlements", {
      clerkUserId: args.clerkUserId,
      ...patch,
    });
  },
});
