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

export function assertValidDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("Invalid date.");
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const normalized = new Date(Date.UTC(year, month - 1, day))
    .toISOString()
    .slice(0, 10);

  if (normalized !== dateKey) {
    throw new Error("Invalid date.");
  }
}

export function assertValidTimezoneOffset(timezoneOffsetMinutes: number) {
  if (
    !Number.isInteger(timezoneOffsetMinutes) ||
    timezoneOffsetMinutes < -840 ||
    timezoneOffsetMinutes > 840
  ) {
    throw new Error("Invalid timezone.");
  }
}
