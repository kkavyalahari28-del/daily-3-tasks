import assert from "node:assert/strict";
import test from "node:test";

import {
  getLocalDateKeyFromTimestamp,
  rollTasksForward,
} from "../convex/dailyTasks.js";

const tasks = [
  {
    id: "task-1",
    text: "First task",
    section: "important",
    position: 0,
    completed: false,
  },
  {
    id: "task-2",
    text: "Second task",
    section: "important",
    position: 1,
    completed: true,
  },
  {
    id: "task-3",
    text: "Third task",
    section: "important",
    position: 2,
    completed: false,
  },
  {
    id: "task-4",
    text: "Fourth task",
    section: "later",
    position: 3,
    completed: false,
  },
  {
    id: "task-5",
    text: "Fifth task",
    section: "later",
    position: 4,
    completed: false,
  },
];

test("unfinished important tasks stay on top and Later fills the open place", () => {
  const rolled = rollTasksForward(tasks);

  assert.deepEqual(
    rolled.filter((task) => task.section === "important").map((task) => task.id),
    ["task-1", "task-3", "task-4"],
  );
});

test("completed tasks stay completed and move below unfinished tasks", () => {
  const rolled = rollTasksForward(tasks);

  assert.deepEqual(
    rolled.map(({ id, completed, section, position }) => ({
      id,
      completed,
      section,
      position,
    })),
    [
      { id: "task-1", completed: false, section: "important", position: 0 },
      { id: "task-3", completed: false, section: "important", position: 1 },
      { id: "task-4", completed: false, section: "important", position: 2 },
      { id: "task-5", completed: false, section: "later", position: 3 },
      { id: "task-2", completed: true, section: "later", position: 4 },
    ],
  );
});

test("the top three stay unchanged when none were completed", () => {
  const allOpen = tasks.map((task) => ({ ...task, completed: false }));
  const rolled = rollTasksForward(allOpen);

  assert.deepEqual(
    rolled.filter((task) => task.section === "important").map((task) => task.id),
    ["task-1", "task-2", "task-3"],
  );
});

test("an existing checklist date is read in the builder's timezone", () => {
  const eveningInUtc = Date.parse("2026-10-08T20:00:00.000Z");

  assert.equal(
    getLocalDateKeyFromTimestamp(eveningInUtc, -330),
    "2026-10-09",
  );
});
