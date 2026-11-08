import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const toolCategories = v.union(
  v.literal("Power Tools"),
  v.literal("Garden"),
  v.literal("Kitchen"),
  v.literal("Electronics"),
  v.literal("Camping & Outdoors"),
  v.literal("Sports & Fitness"),
  v.literal("Home & Cleaning"),
  v.literal("Other"),
);

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    displayName: v.string(),
    societyId: v.optional(v.id("societies")),
    role: v.union(v.literal("user"), v.literal("admin")),
    trustedLender: v.boolean(),
    trustedBorrower: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user", ["clerkUserId"])
    .index("by_society", ["societyId"]),
  societies: defineTable({
    name: v.string(),
    city: v.string(),
    locality: v.string(),
    latitude: v.number(),
    longitude: v.number(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_status", ["status"]),
  societySuggestions: defineTable({
    suggestingUserId: v.id("users"),
    name: v.string(),
    locality: v.optional(v.string()),
    city: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["suggestingUserId"])
    .index("by_status", ["status"]),
  tools: defineTable({
    ownerId: v.id("users"),
    societyId: v.id("societies"),
    name: v.string(),
    category: toolCategories,
    condition: v.union(v.literal("new"), v.literal("good"), v.literal("fair")),
    description: v.string(),
    active: v.boolean(),
    pricing: v.optional(
      v.object({ dailyAmount: v.number(), currency: v.literal("INR") }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["active"])
    .index("by_society_active", ["societyId", "active"]),
});
