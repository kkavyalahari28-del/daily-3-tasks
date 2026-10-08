import { ConvexError, v } from "convex/values";

import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import {
  assertValidClientId,
  checklistValueValidator,
} from "./checklistModel";
import { classifyOpenAIFailure, getRetryDelayMs } from "./openaiErrors";
import { parseTaskPlan } from "./taskPlan";

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
              "You turn a freelancer's income goal into a complete, focused checklist of 6 to 8 tasks.",
              "Return only a JSON object in this exact shape: {\"mostImportant\":[\"task 1\",\"task 2\",\"task 3\"],\"later\":[\"task 4\",\"task 5\",\"task 6\"]}.",
              "Return exactly three mostImportant tasks in priority order and three to five later tasks in the order they should happen.",
              "Together, the tasks must cover the shortest realistic path from the freelancer's current position to the goal.",
              "Each task must start with a clear action verb, name a concrete output or person, and be possible to start immediately without another decision.",
              "Each task should take roughly 15 to 45 minutes and directly improve the chance of earning income.",
              "Use plain language and speak directly to the freelancer.",
              "Never return vague tasks such as 'work on outreach', 'do research', 'build your brand', or 'make a plan'.",
              "Do not include explanations, headings, deadlines, or guilt.",
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
    clientId: v.string(),
  },
  returns: checklistValueValidator,
  handler: async (ctx, { goal, clientId }) => {
    const cleanGoal = goal.trim();

    try {
      assertValidClientId(clientId);
    } catch {
      throw new ConvexError("This browser could not save its checklist.");
    }

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

    let plan;

    try {
      plan = parseTaskPlan(content);
    } catch {
      throw new ConvexError(
        "The AI returned an unexpected answer. Please try again.",
      );
    }

    const tasks = [...plan.mostImportant, ...plan.later].map(
      (text, position) => ({
        id: crypto.randomUUID(),
        text,
        section: position < 3 ? ("important" as const) : ("later" as const),
        position,
        completed: false,
      }),
    );

    await ctx.runMutation(internal.checklists.saveGenerated, {
      clientId,
      goal: cleanGoal,
      tasks,
    });

    return {
      goal: cleanGoal,
      tasks,
    };
  },
});
