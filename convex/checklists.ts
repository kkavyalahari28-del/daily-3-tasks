import { ConvexError, v } from "convex/values";

import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import {
  assertValidClientId,
  checklistValueValidator,
  savedTaskValidator,
} from "./checklistModel";

export const getForClient = query({
  args: {
    clientId: v.string(),
  },
  returns: v.union(v.null(), checklistValueValidator),
  handler: async (ctx, { clientId }) => {
    try {
      assertValidClientId(clientId);
    } catch {
      throw new ConvexError("This browser could not load its checklist.");
    }

    const checklist = await ctx.db
      .query("checklists")
      .withIndex("by_client_id", (q) => q.eq("clientId", clientId))
      .unique();

    if (!checklist) {
      return null;
    }

    return {
      goal: checklist.goal,
      tasks: checklist.tasks,
    };
  },
});

export const saveGenerated = internalMutation({
  args: {
    clientId: v.string(),
    goal: v.string(),
    tasks: v.array(savedTaskValidator),
  },
  returns: v.null(),
  handler: async (ctx, { clientId, goal, tasks }) => {
    assertValidClientId(clientId);

    const checklist = await ctx.db
      .query("checklists")
      .withIndex("by_client_id", (q) => q.eq("clientId", clientId))
      .unique();
    const value = {
      clientId,
      goal,
      tasks,
      updatedAt: Date.now(),
    };

    if (checklist) {
      await ctx.db.patch(checklist._id, value);
    } else {
      await ctx.db.insert("checklists", value);
    }

    return null;
  },
});

export const setTaskCompleted = mutation({
  args: {
    clientId: v.string(),
    taskId: v.string(),
    completed: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { clientId, taskId, completed }) => {
    try {
      assertValidClientId(clientId);
    } catch {
      throw new ConvexError("This browser could not update its checklist.");
    }

    const checklist = await ctx.db
      .query("checklists")
      .withIndex("by_client_id", (q) => q.eq("clientId", clientId))
      .unique();

    if (!checklist) {
      throw new ConvexError("This checklist is no longer available.");
    }

    const taskExists = checklist.tasks.some((task) => task.id === taskId);

    if (!taskExists) {
      throw new ConvexError("This task is no longer available.");
    }

    await ctx.db.patch(checklist._id, {
      tasks: checklist.tasks.map((task) =>
        task.id === taskId ? { ...task, completed } : task,
      ),
      updatedAt: Date.now(),
    });

    return null;
  },
});
