const FALLBACK_MESSAGE = "I couldn't make your tasks. Please try again.";

export function getActionErrorMessage(error) {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof error.data === "string" &&
    error.data.trim()
  ) {
    return error.data.trim();
  }

  return FALLBACK_MESSAGE;
}
