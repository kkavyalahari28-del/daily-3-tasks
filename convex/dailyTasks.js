export function rollTasksForward(tasks) {
  const orderedTasks = [...tasks].sort(
    (first, second) => first.position - second.position,
  );
  const unfinishedImportant = orderedTasks.filter(
    (task) => task.section === "important" && !task.completed,
  );
  const unfinishedLater = orderedTasks.filter(
    (task) => task.section === "later" && !task.completed,
  );
  const nextImportant = [...unfinishedImportant, ...unfinishedLater].slice(0, 3);
  const importantIds = new Set(nextImportant.map((task) => task.id));
  const remainingUnfinished = orderedTasks.filter(
    (task) => !task.completed && !importantIds.has(task.id),
  );
  const completedTasks = orderedTasks.filter((task) => task.completed);

  return [...nextImportant, ...remainingUnfinished, ...completedTasks].map(
    (task, position) => ({
      ...task,
      section: position < nextImportant.length ? "important" : "later",
      position,
    }),
  );
}

export function getLocalDateKeyFromTimestamp(timestamp, timezoneOffsetMinutes) {
  return new Date(timestamp - timezoneOffsetMinutes * 60_000)
    .toISOString()
    .slice(0, 10);
}
