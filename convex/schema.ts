import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Cloud-synced league storage for Pro users. The full League object (scoring,
// roster, draft state) is stored as a JSON string so the client-side domain
// model stays the source of truth for its shape; Convex handles per-user
// storage and realtime broadcast across devices.
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
});
