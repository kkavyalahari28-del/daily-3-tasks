import { v } from "convex/values";

export const taskSectionValidator = v.union(
  v.literal("important"),
  v.literal("later"),
);

export const savedTaskValidator = v.object({
  id: v.string(),
  text: v.string(),
  section: taskSectionValidator,
  position: v.number(),
  completed: v.boolean(),
});

export const checklistValueValidator = v.object({
  goal: v.string(),
  tasks: v.array(savedTaskValidator),
});

export function assertValidClientId(clientId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(clientId)) {
    throw new Error("Invalid browser ID.");
  }
}
