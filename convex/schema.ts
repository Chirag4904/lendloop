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
    .index("by_role", ["role"])
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
    societyId: v.optional(v.id("societies")),
  })
    .index("by_user", ["suggestingUserId"])
    .index("by_status", ["status"]),
  tools: defineTable({
    ownerId: v.id("users"),
    societyId: v.id("societies"),
    name: v.string(),
    category: toolCategories,
    condition: v.union(
      v.literal("new"),
      v.literal("likeNew"),
      v.literal("good"),
      v.literal("fair"),
      v.literal("wellUsed"),
    ),
    description: v.string(),
    active: v.boolean(),
    archived: v.optional(v.boolean()),
    photoIds: v.optional(v.array(v.id("listingPhotos"))),
    pricing: v.optional(
      v.object({ dailyAmount: v.number(), currency: v.literal("INR") }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["active"])
    .index("by_society_active", ["societyId", "active"])
    .index("by_owner", ["ownerId"]),
  listingPhotos: defineTable({
    ownerId: v.id("users"),
    toolId: v.optional(v.id("tools")),
    storageId: v.id("_storage"),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_and_tool", ["ownerId", "toolId"])
    .index("by_tool", ["toolId"])
    .index("by_storage", ["storageId"]),
  borrowRequests: defineTable({
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    days: v.number(),
    rateMinor: v.number(),
    totalMinor: v.number(),
    currency: v.literal("INR"),
    listedRateMinor: v.optional(v.number()),
    borrowerOfferMinor: v.optional(v.number()),
    lenderCounterMinor: v.optional(v.number()),
    priceDecision: v.optional(
      v.union(
        v.literal("accepted_offer"),
        v.literal("countered"),
        v.literal("kept_listed_price"),
      ),
    ),
    borrowerRespondedAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("awaiting_borrower"),
      v.literal("approved"),
      v.literal("declined"),
      v.literal("cancelled"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index("by_borrower", ["borrowerId"])
    .index("by_borrower_and_status", ["borrowerId", "status"])
    .index("by_lender_and_status", ["lenderId", "status"])
    .index("by_status", ["status"])
    .index("by_lender", ["lenderId"])
    .index("by_tool_and_borrower", ["toolId", "borrowerId"]),
  loans: defineTable({
    requestId: v.id("borrowRequests"),
    toolId: v.id("tools"),
    borrowerId: v.id("users"),
    lenderId: v.id("users"),
    startDate: v.string(),
    endDate: v.string(),
    days: v.number(),
    rateMinor: v.number(),
    totalMinor: v.number(),
    currency: v.literal("INR"),
    status: v.union(
      v.literal("reserved"),
      v.literal("return_pending"),
      v.literal("returned"),
    ),
    approvedAt: v.number(),
    returnReportedAt: v.optional(v.number()),
    returnedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_request", ["requestId"])
    .index("by_end_date", ["endDate"])
    .index("by_status_and_end_date", ["status", "endDate"])
    .index("by_tool_and_status_and_start_date", [
      "toolId",
      "status",
      "startDate",
    ])
    .index("by_borrower", ["borrowerId"])
    .index("by_lender", ["lenderId"])
    .index("by_borrower_and_status", ["borrowerId", "status"])
    .index("by_lender_and_status", ["lenderId", "status"]),
  savedHandoverDetails: defineTable({
    userId: v.id("users"),
    phone: v.string(),
    pickupPoint: v.string(),
    instructions: v.string(),
    returnInstructions: v.string(),
  }).index("by_user", ["userId"]),
  loanHandoverDetails: defineTable({
    loanId: v.id("loans"),
    authorId: v.id("users"),
    phone: v.optional(v.string()),
    pickupPoint: v.optional(v.string()),
    instructions: v.optional(v.string()),
    returnInstructions: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_loan_and_author", ["loanId", "authorId"]),
  uploadTickets: defineTable({
    ownerId: v.id("users"),
    sha256: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_created_at", ["createdAt"]),
  automationEvents: defineTable({
    type: v.string(),
    requestId: v.id("borrowRequests"),
    loanId: v.optional(v.id("loans")),
    recipientId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("retry_pending"),
      v.literal("delivered"),
      v.literal("failed"),
    ),
    attemptCount: v.number(),
    nextAttemptAt: v.number(),
    lease: v.optional(v.string()),
    lastErrorCode: v.optional(v.string()),
    createdAt: v.number(),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_request", ["requestId"])
    .index("by_status", ["status"])
    .index("by_loan", ["loanId"])
    .index("by_recipient", ["recipientId"]),
  notifications: defineTable({
    eventId: v.id("automationEvents"),
    recipientId: v.id("users"),
    loanId: v.optional(v.id("loans")),
    message: v.string(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_recipient", ["recipientId"]),
  overdueReminders: defineTable({
    key: v.string(),
    loanId: v.id("loans"),
    recipientId: v.id("users"),
    date: v.string(),
    status: v.union(
      v.literal("processing"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    lease: v.string(),
    claimedAt: v.number(),
    sentAt: v.optional(v.number()),
    readAt: v.optional(v.number()),
    lastErrorCode: v.optional(v.string()),
  })
    .index("by_key", ["key"])
    .index("by_loan", ["loanId"])
    .index("by_recipient", ["recipientId"])
    .index("by_status_and_claimed_at", ["status", "claimedAt"]),
  automationNonces: defineTable({ nonce: v.string(), createdAt: v.number() })
    .index("by_nonce", ["nonce"])
    .index("by_created_at", ["createdAt"]),
  adminAudit: defineTable({
    actorId: v.optional(v.id("users")),
    action: v.string(),
    targetType: v.string(),
    targetId: v.string(),
    detail: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_actor", ["actorId"]),
});
