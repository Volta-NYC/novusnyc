// ── AUTH TYPES ────────────────────────────────────────────────────────────────

export type Role = "admin" | "project_lead" | "member" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
}

export interface Session {
  userId: string;
  name: string;
  email: string;
  role: Role;
  expiresAt: number;
}

export interface AccessKey {
  id: string;
  key: string;
  label: string;
  role: Role;
  createdAt: string;
  expiresAt: string; // ISO date
  uses: number;
  maxUses: number | null; // null = unlimited
}

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const USERS_KEY = "volta_users";
const SESSION_KEY = "volta_session";
const KEYS_KEY = "volta_access_keys";
const SESSION_TTL_DAYS = 30;

// Hardcoded bootstrap admin key — valid always, creates admin role.
// Change this value in code to rotate the master setup key.
export const BOOTSTRAP_ADMIN_KEY = "VOLTA_ADMIN_2026";

// ── HASH (browser Web Crypto, no backend needed) ──────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  if (typeof window === "undefined") return password; // SSR fallback
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "v0lt@s4lt2026");
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

// ── USERS ─────────────────────────────────────────────────────────────────────

export function getUsers(): User[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function getUserByEmail(email: string): User | undefined {
  return getUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export function getUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  role: Role
): Promise<User> {
  const users = getUsers();
  if (getUserByEmail(email)) throw new Error("Email already registered.");
  const user: User = {
    id: crypto.randomUUID(),
    name,
    email: email.toLowerCase(),
    passwordHash: await hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);
  return user;
}

export function updateUser(id: string, updates: Partial<Pick<User, "name" | "role">>): void {
  const users = getUsers().map((u) => (u.id === id ? { ...u, ...updates } : u));
  saveUsers(users);
}

export function deleteUser(id: string): void {
  saveUsers(getUsers().filter((u) => u.id !== id));
}

// ── SESSION ───────────────────────────────────────────────────────────────────

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session: Session = JSON.parse(raw);
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function createSession(user: User): Session {
  const session: Session = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession(): void {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
}

// ── ACCESS KEYS ───────────────────────────────────────────────────────────────

export function getAccessKeys(): AccessKey[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEYS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveAccessKeys(keys: AccessKey[]): void {
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
}

export function generateAccessKey(
  label: string,
  role: Role,
  expiryDays: number = 7,
  maxUses: number | null = null
): AccessKey {
  const key: AccessKey = {
    id: crypto.randomUUID(),
    key: `VOLTA-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    label,
    role,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString(),
    uses: 0,
    maxUses,
  };
  saveAccessKeys([...getAccessKeys(), key]);
  return key;
}

export function validateAccessKey(input: string): { valid: boolean; role?: Role; keyId?: string; error?: string } {
  // Bootstrap admin key always works
  if (input.trim() === BOOTSTRAP_ADMIN_KEY) {
    return { valid: true, role: "admin" };
  }

  const keys = getAccessKeys();
  const found = keys.find((k) => k.key === input.trim());

  if (!found) return { valid: false, error: "Invalid access key." };
  if (new Date(found.expiresAt) < new Date()) return { valid: false, error: "This access key has expired." };
  if (found.maxUses !== null && found.uses >= found.maxUses) return { valid: false, error: "This key has reached its maximum uses." };

  return { valid: true, role: found.role, keyId: found.id };
}

export function consumeKey(keyId: string): void {
  const keys = getAccessKeys().map((k) =>
    k.id === keyId ? { ...k, uses: k.uses + 1 } : k
  );
  saveAccessKeys(keys);
}

export function revokeKey(id: string): void {
  saveAccessKeys(getAccessKeys().filter((k) => k.id !== id));
}

// ── ROLE CHECKS ───────────────────────────────────────────────────────────────

export function canEdit(role: Role): boolean {
  return role === "admin" || role === "project_lead" || role === "member";
}

export function canDelete(role: Role): boolean {
  return role === "admin";
}

export function canManageKeys(role: Role): boolean {
  return role === "admin";
}
