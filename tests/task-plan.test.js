import assert from "node:assert/strict";
import test from "node:test";

import { parseTaskPlan } from "../convex/taskPlan.js";

test("accepts exactly three important tasks and three to five later tasks", () => {
  const plan = parseTaskPlan(
    JSON.stringify({
      mostImportant: ["Task 1", "Task 2", "Task 3"],
      later: ["Task 4", "Task 5", "Task 6", "Task 7"],
    }),
  );

  assert.deepEqual(plan.mostImportant, ["Task 1", "Task 2", "Task 3"]);
  assert.deepEqual(plan.later, ["Task 4", "Task 5", "Task 6", "Task 7"]);
});

test("rejects a plan without exactly three important tasks", () => {
  assert.throws(() =>
    parseTaskPlan(
      JSON.stringify({
        mostImportant: ["Task 1", "Task 2"],
        later: ["Task 3", "Task 4", "Task 5"],
      }),
    ),
  );
});

test("rejects repeated tasks", () => {
  assert.throws(() =>
    parseTaskPlan(
      JSON.stringify({
        mostImportant: ["Task 1", "Task 2", "Task 3"],
        later: ["Task 3", "Task 4", "Task 5"],
      }),
    ),
  );
});
