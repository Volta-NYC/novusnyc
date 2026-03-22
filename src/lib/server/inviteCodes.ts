import { dbPatch, dbRead } from "@/lib/server/adminApi";
import { getAdminDB } from "@/lib/firebaseAdmin";

type AuthRole = "admin" | "project_lead" | "interviewer" | "member";

type InviteCodeRecord = {
  code?: string;
  role?: AuthRole;
  expiresAt?: string;
  used?: boolean;
  usedBy?: string;
  usedAt?: string;
  multiUse?: boolean;
  active?: boolean;
  source?: "manual" | "auto_rotation";
  signupCount?: number;
  lastUsedBy?: string;
  lastUsedAt?: string;
  createdBy?: string;
  createdAt?: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `VOLTA-${suffix}`;
}

function toDateMs(value: string): number {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function isInviteCodeExpired(expiresAt: string): boolean {
  const raw = expiresAt.trim().toLowerCase();
  if (raw === "never") return false;
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return true;
  return t < Date.now();
}

function normalizeSiteUrl(baseUrl?: string): string {
  const raw = (baseUrl ?? process.env.NEXT_PUBLIC_SITE_URL ?? "https://voltanyc.org").trim();
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto.replace(/\/+$/g, "");
}

function toSignupLink(baseUrl: string, code: string): string {
  return `${normalizeSiteUrl(baseUrl)}/members/signup?code=${encodeURIComponent(code)}`;
}

function normalizeRotationDays(input?: number): number {
  const fallback = Number(process.env.ACCEPTANCE_INVITE_ROTATION_DAYS ?? 3);
  const raw = Number.isFinite(input) && input ? Number(input) : fallback;
  const whole = Math.trunc(raw);
  if (!Number.isFinite(whole) || whole <= 0) return 3;
  return Math.max(1, Math.min(30, whole));
}

function getInviteCodeCount(row: InviteCodeRecord): number {
  const count = Number(row.signupCount);
  if (Number.isFinite(count) && count >= 0) return Math.trunc(count);
  return row.used || row.usedBy ? 1 : 0;
}

export async function getOrCreateRotatingInviteLink(input?: {
  role?: AuthRole;
  createdBy?: string;
  baseUrl?: string;
  rotationDays?: number;
  idToken?: string;
}): Promise<{ code: string; link: string; expiresAt: string; created: boolean }> {
  const role: AuthRole = input?.role ?? "member";
  const baseUrl = normalizeSiteUrl(input?.baseUrl);
  const days = normalizeRotationDays(input?.rotationDays);

  const allRaw = (await dbRead("inviteCodes", input?.idToken)) as Record<string, InviteCodeRecord> | null;
  const all = allRaw ?? {};

  const existing = Object.entries(all)
    .filter(([, row]) => {
      if (!row || typeof row !== "object") return false;
      if ((row.source ?? "manual") !== "auto_rotation") return false;
      if ((row.role ?? "member") !== role) return false;
      if (row.active === false) return false;
      const expiresAt = String(row.expiresAt ?? "").trim();
      if (!expiresAt) return false;
      return !isInviteCodeExpired(expiresAt);
    })
    .sort((a, b) => toDateMs(String(b[1].createdAt ?? "")) - toDateMs(String(a[1].createdAt ?? "")));

  if (existing.length > 0) {
    const [code, row] = existing[0];
    const expiresAt = String(row.expiresAt ?? "");
    return {
      code,
      link: toSignupLink(baseUrl, code),
      expiresAt,
      created: false,
    };
  }

  let code = "";
  for (let i = 0; i < 64; i += 1) {
    const candidate = generateInviteCode();
    if (!all[candidate]) {
      code = candidate;
      break;
    }
  }
  if (!code) {
    code = `VOLTA-${Date.now().toString(36).slice(-8).toUpperCase()}`;
  }

  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const record: InviteCodeRecord = {
    code,
    role,
    expiresAt,
    used: false,
    multiUse: true,
    active: true,
    source: "auto_rotation",
    signupCount: 0,
    createdBy: (input?.createdBy ?? "system").trim() || "system",
    createdAt: nowIso,
  };
  await dbPatch(`inviteCodes/${code}`, record as Record<string, unknown>, input?.idToken);

  return {
    code,
    link: toSignupLink(baseUrl, code),
    expiresAt,
    created: true,
  };
}

export async function incrementInviteCodeUsage(input: {
  code: string;
  email: string;
  idToken?: string;
}): Promise<boolean> {
  const code = String(input.code ?? "").trim().toUpperCase();
  const email = normalizeEmail(String(input.email ?? ""));
  if (!code || !email) return false;

  const nowIso = new Date().toISOString();
  const adminDb = getAdminDB();
  if (adminDb) {
    const result = await adminDb.ref(`inviteCodes/${code}`).transaction((current) => {
      if (!current || typeof current !== "object") return current;
      const row = current as InviteCodeRecord;
      const nextCount = getInviteCodeCount(row) + 1;
      const next: InviteCodeRecord = {
        ...row,
        signupCount: nextCount,
        lastUsedBy: email,
        lastUsedAt: nowIso,
      };
      if (row.multiUse === false) {
        next.used = true;
        next.usedBy = email;
        next.usedAt = nowIso;
      }
      return next as unknown as object;
    });
    return result.committed;
  }

  const raw = (await dbRead(`inviteCodes/${code}`, input.idToken)) as InviteCodeRecord | null;
  if (!raw || typeof raw !== "object") return false;

  const patch: Record<string, unknown> = {
    signupCount: getInviteCodeCount(raw) + 1,
    lastUsedBy: email,
    lastUsedAt: nowIso,
  };
  if (raw.multiUse === false) {
    patch.used = true;
    patch.usedBy = email;
    patch.usedAt = nowIso;
  }
  await dbPatch(`inviteCodes/${code}`, patch, input.idToken);
  return true;
}
