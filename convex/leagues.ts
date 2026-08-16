import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

async function requireProUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await requireUserId(ctx);
  const entitlement = await ctx.db
    .query("entitlements")
    .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", userId))
    .unique();
  if (entitlement?.status !== "active") {
    throw new Error("Not Pro");
  }
  return userId;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const entitlement = await ctx.db
      .query("entitlements")
      .withIndex("by_clerk_user", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (entitlement?.status !== "active") return [];
    return await ctx.db
      .query("leagues")
      .withIndex("by_user", (q) => q.eq("userId", identity.subject))
      .collect();
  },
});

export const upsert = mutation({
  args: {
    leagueId: v.string(),
    name: v.string(),
    sport: v.union(v.literal("baseball"), v.literal("football")),
    data: v.string(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireProUserId(ctx);
    const existing = await ctx.db
      .query("leagues")
      .withIndex("by_user_league", (q) =>
        q.eq("userId", userId).eq("leagueId", args.leagueId),
      )
      .unique();

    if (existing) {
      if (existing.updatedAt >= args.updatedAt) return existing._id;
      await ctx.db.patch(existing._id, {
        name: args.name,
        sport: args.sport,
        data: args.data,
        updatedAt: args.updatedAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("leagues", { userId, ...args });
  },
});

export const remove = mutation({
  args: { leagueId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireProUserId(ctx);
    const existing = await ctx.db
      .query("leagues")
      .withIndex("by_user_league", (q) =>
        q.eq("userId", userId).eq("leagueId", args.leagueId),
      )
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
