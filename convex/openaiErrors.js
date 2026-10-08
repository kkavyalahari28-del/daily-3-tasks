const GENERIC_MESSAGE =
  "The AI could not make your tasks right now. Please try again.";

export function classifyOpenAIFailure(status, payload) {
  const error =
    typeof payload === "object" && payload !== null && "error" in payload
      ? payload.error
      : null;
  const type =
    typeof error === "object" && error !== null && "type" in error
      ? error.type
      : null;
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : null;

  if (
    status === 429 &&
    (type === "insufficient_quota" ||
      code === "insufficient_quota" ||
      code === "billing_hard_limit_reached")
  ) {
    return {
      kind: "credits",
      retryable: false,
      message:
        "OpenAI API credits are used up. Add credits to the OpenAI API account, then try again.",
    };
  }

  if (status === 429) {
    return {
      kind: "rate_limit",
      retryable: true,
      message: "OpenAI is busy right now. Wait a minute and try again.",
    };
  }

  if (status >= 500) {
    return {
      kind: "openai_server",
      retryable: true,
      message: GENERIC_MESSAGE,
    };
  }

  return {
    kind: "openai_request",
    retryable: false,
    message: GENERIC_MESSAGE,
  };
}

export function getRetryDelayMs(attempt, retryAfter) {
  const retryAfterSeconds = Number(retryAfter);

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 5000);
  }

  return 750 * 2 ** attempt;
}
