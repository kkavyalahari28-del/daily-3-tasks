import { ConvexError, v } from "convex/values";

import { action } from "./_generated/server";
import { classifyOpenAIFailure, getRetryDelayMs } from "./openaiErrors";

const TASK_MODEL = "gpt-6-luna";
const MAX_OPENAI_ATTEMPTS = 3;

const wait = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function askOpenAI(cleanGoal: string, apiKey: string) {
  for (let attempt = 0; attempt < MAX_OPENAI_ATTEMPTS; attempt += 1) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TASK_MODEL,
        reasoning_effort: "low",
        max_completion_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: [
              "You turn a freelancer's income goal into today's three best tasks.",
              "Return only a JSON object in this exact shape: {\"tasks\":[\"task 1\",\"task 2\",\"task 3\"]}.",
              "Return exactly three tasks in priority order.",
              "Each task must start with a clear action verb, name a concrete output or person, and be possible to start immediately without another decision.",
              "Each task should take roughly 15 to 45 minutes and directly improve the chance of earning income.",
              "Use plain language and speak directly to the freelancer.",
              "Never return vague tasks such as 'work on outreach', 'do research', 'build your brand', or 'make a plan'.",
              "Do not include explanations, headings, deadlines, guilt, or more than three tasks.",
            ].join(" "),
          },
          {
            role: "user",
            content: `My goal: ${cleanGoal}`,
          },
        ],
      }),
    });

    if (response.ok) {
      return response;
    }

    const payload = await response.json().catch(() => null);
    const failure = classifyOpenAIFailure(response.status, payload);
    const isLastAttempt = attempt === MAX_OPENAI_ATTEMPTS - 1;

    console.error("OpenAI request failed", {
      status: response.status,
      kind: failure.kind,
      attempt: attempt + 1,
    });

    if (!failure.retryable || isLastAttempt) {
      throw new ConvexError(failure.message);
    }

    await wait(
      getRetryDelayMs(attempt, response.headers.get("retry-after")),
    );
  }

  throw new ConvexError(
    "The AI could not make your tasks right now. Please try again.",
  );
}

export const generate = action({
  args: {
    goal: v.string(),
  },
  returns: v.array(v.string()),
  handler: async (_ctx, { goal }) => {
    const cleanGoal = goal.trim();

    if (!cleanGoal) {
      throw new ConvexError("Write your goal first.");
    }

    if (cleanGoal.length > 500) {
      throw new ConvexError("Keep your goal under 500 characters.");
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new ConvexError(
        "OpenAI is not connected yet. Add OPENAI_API_KEY in Convex.",
      );
    }

    const response = await askOpenAI(cleanGoal, apiKey);

    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      throw new ConvexError(
        "The AI returned an unexpected answer. Please try again.",
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch {
      throw new ConvexError(
        "The AI returned an unexpected answer. Please try again.",
      );
    }

    const tasks =
      typeof parsed === "object" && parsed !== null && "tasks" in parsed
        ? (parsed as { tasks?: unknown }).tasks
        : null;

    if (
      !Array.isArray(tasks) ||
      tasks.length !== 3 ||
      tasks.some((task) => typeof task !== "string" || !task.trim())
    ) {
      throw new ConvexError(
        "The AI returned an unexpected answer. Please try again.",
      );
    }

    return tasks.map((task) => task.trim());
  },
});
