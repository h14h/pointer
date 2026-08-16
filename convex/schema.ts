import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  leagues: defineTable({
    userId: v.string(),
    leagueId: v.string(),
    name: v.string(),
    sport: v.union(v.literal("baseball"), v.literal("football")),
    data: v.string(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_league", ["userId", "leagueId"]),

  entitlements: defineTable({
    clerkUserId: v.string(),
    status: v.string(),
    period: v.string(),
    polarOrderId: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_clerk_user", ["clerkUserId"]),
});
