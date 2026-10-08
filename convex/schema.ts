import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import { savedTaskValidator } from "./checklistModel";

export default defineSchema({
  checklists: defineTable({
    clientId: v.string(),
    goal: v.string(),
    tasks: v.array(savedTaskValidator),
    updatedAt: v.number(),
  }).index("by_client_id", ["clientId"]),
});
