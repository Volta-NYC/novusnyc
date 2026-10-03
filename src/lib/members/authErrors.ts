type AuthFailure = { code?: string; message?: string; name?: string };

const EXPIRED_CODES = new Set([
  "reauthentication_needed",
  "session_expired",
  "session_not_found",
  "refresh_token_not_found",
  "bad_jwt",
]);

// Supabase reports the cause in `code`; matching on message text missed the
// most common one — reusing your current password — and every failure then
// collapsed into one unexplained message.
export function describePasswordError(err: unknown): string {
  const e = (err ?? {}) as AuthFailure;
  const code = e.code ?? "";
  const message = (e.message ?? "").toLowerCase();

  if (code === "same_password" || message.includes("different from the old")) {
    return "That is already your current password. Choose a different one.";
  }
  if (code === "weak_password" || message.includes("weak") || message.includes("password should be")) {
    return "Password is too weak. Use at least 8 characters with a mix of letters and numbers.";
  }
  if (
    EXPIRED_CODES.has(code) ||
    e.name === "AuthSessionMissingError" ||
    message.includes("no_session") ||
    message.includes("session missing")
  ) {
    return "This link has expired or was already used. Request a new one from the sign-in page.";
  }
  if (code === "over_request_rate_limit" || message.includes("rate limit")) {
    return "Too many attempts. Wait a few minutes and try again.";
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return "";
}
