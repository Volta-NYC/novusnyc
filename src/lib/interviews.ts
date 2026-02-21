/** Generates a URL-safe alphanumeric interview invite token. */
export function generateToken(length = 16): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** Returns true if the token is structurally valid (no special chars). */
export function isValidToken(token: string): boolean {
  return /^[A-Za-z0-9]{8,32}$/.test(token);
}
