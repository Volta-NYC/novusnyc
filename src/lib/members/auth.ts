// Simple password-only auth for Volta NYC members portal
// Data is stored in Firebase. Auth is just a password gate stored in localStorage.

const MEMBERS_PASSWORD = "VoltaHitsItBIG2026!";
const AUTH_KEY = "volta_authed";

export function checkPassword(pw: string): boolean {
  return pw === MEMBERS_PASSWORD;
}

export function isAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_KEY) === "true";
}

export function setAuthenticated(): void {
  if (typeof window !== "undefined") localStorage.setItem(AUTH_KEY, "true");
}

export function clearAuth(): void {
  if (typeof window !== "undefined") localStorage.removeItem(AUTH_KEY);
}
