import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
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
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("leagues")
      .withIndex("by_user_league", (q) =>
        q.eq("userId", userId).eq("leagueId", args.leagueId),
      )
      .unique();

    if (existing) {
      // Last write wins; ignore stale pushes from devices that are behind.
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
    const userId = await requireUserId(ctx);
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
