export function parseTaskPlan(content) {
  const parsed = JSON.parse(content);
  const mostImportant = parsed?.mostImportant;
  const later = parsed?.later;

  if (
    !Array.isArray(mostImportant) ||
    mostImportant.length !== 3 ||
    !Array.isArray(later) ||
    later.length < 3 ||
    later.length > 5
  ) {
    throw new Error("Unexpected task groups.");
  }

  const tasks = [...mostImportant, ...later];

  if (
    tasks.some(
      (task) =>
        typeof task !== "string" ||
        !task.trim() ||
        task.trim().length > 180,
    )
  ) {
    throw new Error("Unexpected task text.");
  }

  const normalized = tasks.map((task) => task.trim());
  const uniqueTasks = new Set(normalized.map((task) => task.toLowerCase()));

  if (uniqueTasks.size !== normalized.length) {
    throw new Error("Repeated tasks.");
  }

  return {
    mostImportant: normalized.slice(0, 3),
    later: normalized.slice(3),
  };
}
