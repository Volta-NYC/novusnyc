# Portal Deep Audit — Findings & Plan

Scope: silent failures, unhandled rejections, type-safety gaps, UI/auth regressions across Member and Admin portal surfaces.
Baseline: `npm run build` passes on `main` @ 9f93660.

## Findings

### F1 — `authContext` ignores soft-deleted team rows (P1, security)
`src/lib/members/authContext.tsx:67` queries `team` filtered by email/alternate_email but **omits `.is("deleted_at", null)`**. Server-side `verifyCaller` (`src/lib/server/adminApi.ts:86,93`) correctly filters soft-deleted rows, but the client-side profile resolution does not. Effect: a member soft-deleted via `team.deleted_at` still resolves to a `UserProfile` with their stale `auth_role` from the deleted row. If `status` was not also set to `Inactive`, the layout’s deactivation sign-out (`MembersLayout.tsx:166`) won’t fire either. Fix by adding the same `is("deleted_at", null)` filter applied elsewhere.

### F2 — `sync-profile` resets `join_date` on every call (P2, data integrity)
`src/app/api/members/sync-profile/route.ts:50` unconditionally writes `patch.join_date = nowIso.split("T")[0]` for existing members. The comment says "after clearing old values" but no clearing happens. Each call rewrites join_date to today and (because `Object.keys(patch).length > 0` is now always true) re-runs the update with a stale notes overwrite. join_date should be preserved on existing members and only set when missing.

### F3 — `sync-profile` notes overwrite (P3, minor)
Same file, line 52: `patch.notes = … "Synced from signup"` is written whenever any patch keys exist. With F2 fixed, this becomes a no-op for existing members, so F3 collapses into F2.

### Items inspected, no fix needed
- API auth: every member-mutating route under `src/app/api/members/**` calls `verifyCaller` or token-validates manually; the four exceptions (`signup-guard`, `auth/reset-password`, `signup/resend-link`, `sync-profile`) are intentionally public and rate-limited via `consumeRateLimit`.
- `supabaseAdmin.ts` has `import "server-only"` (line 1) — no client-bundle leak risk.
- Realtime subscribers (`makeSubscriber` in `storage.ts:745`) return a proper unsubscribe; all callers chain it through `useEffect` cleanup.
- Page-level auth guards on owner-restricted pages (`admin`, `email/templates`, `email/automations`) follow the canonical redirect + `return null` pattern. Other pages (`bids`, `applicants`, `team`, `email`) intentionally render to members but gate writes via `authRole === "owner"`; data fetches are also gated, so no unauthorized data is loaded. Adding a redirect there would be a UX change beyond the audit's "no architecture rewrites" guardrail.

## Execution order
1. F1 fix in `authContext.tsx` — add `.is("deleted_at", null)` to the team lookup.
2. F2 fix in `sync-profile/route.ts` — only set `join_date` when `target.join_date` is empty; drop the misleading comment; let the notes-overwrite become inert.
3. `npm run build` after each edit; revert immediately on failure.
