import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  invitations: defineTable({
    invitationId: v.string(),
    shortCode: v.string(),
    creatorEmail: v.string(),
    creatorName: v.string(),
    creatorRole: v.optional(v.string()),
    guestName: v.optional(v.string()),
    guestContact: v.optional(v.string()),
    contactType: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("expired")
    ),
    createdAt: v.string(),
    activatedAt: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    pricingMode: v.string(),
    durationHours: v.number(),
    guestCurrencyMode: v.optional(v.string()),
    guestMultiplier: v.optional(v.float64()),
    pin: v.optional(v.string()),
    boundToken: v.optional(v.string()),
  })
    .index("by_creatorEmail", ["creatorEmail"])
    .index("by_shortCode", ["shortCode"])
    .index("by_status", ["status"]),

  productViews: defineTable({
    timestamp: v.string(),
    itemId: v.string(),
    productName: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    referrer: v.optional(v.string()),
    deviceType: v.optional(v.string()),
    browser: v.optional(v.string()),
    country: v.optional(v.string()),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userRole: v.optional(v.string()),
    inviterName: v.optional(v.string()),
  })
    .index("by_itemId", ["itemId"])
    .index("by_inviterName", ["inviterName"])
    .index("by_userEmail", ["userEmail"]),
});
