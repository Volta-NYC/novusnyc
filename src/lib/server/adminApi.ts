import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDB } from "@/lib/firebaseAdmin";

const DB_URL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

export interface VerifiedCaller {
  uid: string;
  email: string;
  name: string;
  role: string;
  idToken: string;
}

type VerifyResult =
  | { ok: true; caller: VerifiedCaller }
  | { ok: false; status: number; error: string };

function toDbUrl(path: string, idToken?: string): string {
  if (!DB_URL) throw new Error("no_db");
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  const base = cleanPath ? `${DB_URL}/${cleanPath}.json` : `${DB_URL}/.json`;
  if (!idToken) return base;
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}auth=${encodeURIComponent(idToken)}`;
}

export function getBearerToken(req: NextRequest): string {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
}

async function verifyTokenViaRest(idToken: string): Promise<{ uid: string; email: string; name: string } | null> {
  if (!API_KEY) return null;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(API_KEY)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    }
  );
  if (!res.ok) return null;

  const data = await res.json() as {
    users?: Array<{ localId?: string; email?: string; displayName?: string }>;
  };
  const user = data.users?.[0];
  if (!user?.localId) return null;

  return {
    uid: user.localId,
    email: user.email ?? "",
    name: user.displayName ?? "",
  };
}

export async function dbRead(path: string, idToken?: string): Promise<unknown> {
  const adminDb = getAdminDB();
  if (adminDb) {
    const snap = await adminDb.ref(path).get();
    return snap.exists() ? snap.val() : null;
  }

  const res = await fetch(toDbUrl(path, idToken), { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("db_read_failed");
  const data = await res.json() as unknown;
  return data ?? null;
}

export async function dbPatch(path: string, data: Record<string, unknown>, idToken?: string): Promise<void> {
  const adminDb = getAdminDB();
  if (adminDb) {
    await adminDb.ref(path).update(data);
    return;
  }

  const res = await fetch(toDbUrl(path, idToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("db_write_failed");
}

export async function dbPush(path: string, data: Record<string, unknown>, idToken?: string): Promise<void> {
  const adminDb = getAdminDB();
  if (adminDb) {
    await adminDb.ref(path).push(data);
    return;
  }

  const res = await fetch(toDbUrl(path, idToken), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("db_write_failed");
}

export async function verifyCaller(
  req: NextRequest,
  allowedRoles: string[]
): Promise<VerifyResult> {
  const idToken = getBearerToken(req);
  if (!idToken) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDB();
  if (adminAuth && adminDb) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      const uid = decoded.uid;
      const email = decoded.email ?? "";
      const name = decoded.name ?? "";
      const roleSnap = await adminDb.ref(`userProfiles/${uid}/authRole`).get();
      const role = roleSnap.exists() ? String(roleSnap.val()) : "";
      if (!allowedRoles.includes(role)) {
        return { ok: false, status: 403, error: "forbidden" };
      }
      return {
        ok: true,
        caller: { uid, email, name, role, idToken },
      };
    } catch {
      return { ok: false, status: 401, error: "unauthorized" };
    }
  }

  const caller = await verifyTokenViaRest(idToken);
  if (!caller) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  let role = "";
  try {
    const roleData = await dbRead(`userProfiles/${caller.uid}/authRole`, idToken);
    role = typeof roleData === "string" ? roleData : "";
  } catch {
    return { ok: false, status: 403, error: "forbidden" };
  }

  if (!allowedRoles.includes(role)) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  return {
    ok: true,
    caller: {
      uid: caller.uid,
      email: caller.email,
      name: caller.name,
      role,
      idToken,
    },
  };
}

export async function writeAuditLog(
  entry: {
    action: string;
    collection: string;
    recordId: string;
    actorUid: string;
    actorEmail: string;
    actorName?: string;
    details?: Record<string, unknown>;
  },
  idToken?: string
): Promise<void> {
  await dbPush(
    "auditLogs",
    {
      timestamp: new Date().toISOString(),
      ...entry,
    },
    idToken
  );
}
