import assert from "node:assert/strict";
import test from "node:test";

import { classifyOpenAIFailure } from "../convex/openaiErrors.js";
import { getActionErrorMessage } from "../src/actionErrors.js";

test("OpenAI credit errors do not retry and explain what to fix", () => {
  const result = classifyOpenAIFailure(429, {
    error: { type: "insufficient_quota", code: "insufficient_quota" },
  });

  assert.equal(result.retryable, false);
  assert.match(result.message, /credits/i);
});

test("temporary OpenAI rate limits can retry", () => {
  const result = classifyOpenAIFailure(429, {
    error: { type: "rate_limit_error", code: "rate_limit_exceeded" },
  });

  assert.equal(result.retryable, true);
  assert.match(result.message, /busy/i);
});

test("the page shows a safe Convex error message", () => {
  assert.equal(
    getActionErrorMessage({ data: "OpenAI API credits are used up." }),
    "OpenAI API credits are used up.",
  );
  assert.equal(
    getActionErrorMessage(new Error("private server detail")),
    "I couldn't make your tasks. Please try again.",
  );
});
