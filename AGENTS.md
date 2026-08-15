# AGENTS.md — Novus Codebase Guide

System instructions for Codex sessions. Read this before touching any file.

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript) |
| Styling | Tailwind CSS 3.4 + custom CSS tokens |
| Database | Supabase (Postgres + Auth + Storage + Realtime) |
| Auth | Supabase Auth (email/password) |
| Rich text | Tiptap 3 |
| Maps | Leaflet + react-leaflet |
| Animations | Framer Motion |
| Email | Nodemailer (SMTP via Gmail) |
| Analytics | Vercel Analytics |
| Deployment | Vercel → www.novusnyc.org |

TypeScript is strict (`"strict": true`). Path alias `@/*` maps to `src/*`.

---

## Architecture & Key File Locations

### Two distinct UIs in one repo

**Public site** (`/`, `/showcase`, `/about`, `/partners`, `/apply`, `/impact`, `/book`, `/updates`, `/reports`) — light theme, `v-*` Tailwind color tokens, fonts: `font-display` (Space Grotesk) / `font-body` (DM Sans).

**Members portal** (`/members/*`) — dark theme (`#0D0F14` bg, `#13161D` panels), `n-yellow` (`#F3E28D`) as primary action color.

### Critical files

| File | Purpose |
|---|---|
| `src/lib/supabaseClient.ts` | Lazy-Proxy anon Supabase client — defers `createClient` until first use (safe to import in SSG modules) |
| `src/lib/supabaseAdmin.ts` | Service-role admin client — **server only, never import client-side** |
| `src/lib/members/storage.ts` | All data types + `subscribe*` realtime functions + CRUD helpers |
| `src/lib/members/authContext.tsx` | React `AuthProvider` + `useAuth()` hook |
| `src/lib/members/supabaseAuth.ts` | `signIn` / `signOut` / `resetPassword` / `getAuthToken` |
| `src/lib/schemas.ts` | Zod-like validation for `ContactFormValues` and `ApplicationFormValues` |
| `src/components/members/ui.tsx` | Shared design system: `Btn`, `Modal`, `Field`, `Input`, `Select`, `Badge`, `SearchBar`, `Empty`, `useConfirm` |
| `src/components/members/MembersLayout.tsx` | Portal shell with sidebar nav |
| `src/components/members/SectionTabs.tsx` | Tab navigation; exports tab arrays (`ASSIGNMENTS_TABS`, `PROJECT_GROUP_TABS`, etc.). `MEMBERS_GROUP_TABS` exists but is no longer rendered on the Team page (single tab, removed). |
| `src/components/members/RichTextEditor.tsx` | Tiptap wrapper; exposes `insertAtCursor` via `forwardRef` / `RichTextEditorHandle` |
| `src/app/members/layout.tsx` | Wraps all `/members/*` pages with `<AuthProvider>` |
| `src/app/globals.css` | Design token `:root` variables + shared utility classes |
| `src/app/api/submit/route.ts` | Handles contact + application form submissions; writes to Supabase and forwards to Google Sheets backup |
| `supabase/migrations/` | Ordered SQL migrations for the linked Supabase project |

### Auth roles

```
owner  → founder / board (full access, all admin actions)
admin  → Senior Associates (elevated: can manage assignments, applicants, email)
member → standard member (read-only access to portal, can claim assignments)
```

Role is stored in `user_profiles.auth_role` (Supabase Postgres) and surfaced via `useAuth()` → `authRole`. Page-level guard pattern:

```tsx
const { authRole, loading } = useAuth();
useEffect(() => {
  if (!loading && authRole === "member") router.replace("/members/projects");
}, [authRole, loading, router]);
```

### Database interaction pattern

All client-side data access goes through `src/lib/members/storage.ts`:

```ts
// Subscribe (realtime + initial fetch):
useEffect(() => subscribeBusinesses(setBusinesses), []);

// One-shot CRUD:
await createAssignment(payload);
await updateBusiness(id, patch);
await deleteBusiness(id);
```

`subscribe*` functions: open a Supabase Realtime channel, fire `setState` on every change, and return an `unsubscribe` function — use that as the `useEffect` cleanup return value.

Server-side API routes use `getSupabaseAdmin()` from `supabaseAdmin.ts`.

DB columns are `snake_case`; TypeScript types are `camelCase`. Conversion happens inside `storage.ts`. Never write raw Supabase queries in page components.

### Running ad-hoc SQL against the live DB

```bash
npx supabase db query --linked "SELECT ..."
```

---

## Commands

```bash
npm run dev        # start dev server (http://localhost:3000)
npm run build      # production build — runs type check + ESLint + page compilation
npm run lint       # ESLint only
npm start          # serve the production build locally
```

---

## Git workflow

After completing and verifying code changes, create a local commit. Do not run
`git push` unless the user explicitly asks to push in the current request. A
push request from an earlier message does not carry forward to later changes.

---

## Code Conventions

### TypeScript
- Strict mode enforced. No `any`. Handle `undefined` explicitly.
- Unused variables must be prefixed with `_` (ESLint rule: `@typescript-eslint/no-unused-vars`). The build fails otherwise.
- Never use `as unknown as X` to bypass types — fix the type instead.

### Comments
- Write no comments by default.
- Only add one when the WHY is non-obvious: a hidden constraint, a workaround, a subtle invariant.
- Never explain what code does — well-named identifiers do that.

### UI — Members portal (dark theme)
- Background layers: page `#0D0F14` → panel `#13161D` → card `#111418` → input `#0F1014`.
- Primary action color: `n-yellow` (`#F3E28D`). Text on yellow: `n-ink` (`#2D282E`) — 11.05:1, AAA.
- Use `Btn`, `Modal`, `Field`, `Input`, `Select` from `ui.tsx` — never raw `<button>` / `<input>` in portal pages.
- `Btn` variants: `primary` (green fill), `secondary` (white/8 glass), `ghost` (text only), `danger` (red tint).
- Row heights in tables: `h-9`. Text sizes: header labels `text-[10px] uppercase tracking-wide`, cell content `text-[11px]`.
- Status/badge pattern: use `<Badge label={value} />` from `ui.tsx`. Colors are defined in `BADGE_COLORS` in `ui.tsx`. Add new status values there when introducing new statuses.
- Empty cells (no data): `<span className="text-white/25">—</span>`.

### UI — Public site (light theme)
- Use `n-*` Tailwind color tokens. The Novus palette is pastel **yellow / orange / purple**:
  - Brand hues: `n-orange` (peach `#F6B78D`), `n-yellow` (`#F3E28D`), `n-purple` (lavender `#BEA2BA`), each with a `-dark` hover variant.
  - Neutrals: `n-ink`, `n-muted`, `n-border`, `n-bg`, `n-card`, `n-dark`.
- Token names describe the **actual hue**. Do not reintroduce inherited names
  (`v-green`, `v-blue`) — they drifted from their values and actively misled.
- Values live once in `src/app/globals.css` `:root`. Change them there, never inline.
- Pastels are light: they work as fills with `text-n-ink` on top, and as text only
  on dark surfaces (`bg-n-dark`, photo heroes). For accent text on light
  backgrounds use a saturated Tailwind shade (e.g. `text-violet-700`), not a pastel.
- Fonts: `font-display` for headings (Space Grotesk), `font-body` for all body copy (DM Sans).
- Wrap scroll containers in `overflow-x-auto` without `snap-x` — free scrolling, no forced card snapping.

### Business directory — track status values

The Business Directory (`/members/projects`) has **two separate status columns**: Tech and Marketing. Each only appears if the business has that track assigned; otherwise shows `—`.

**Tech statuses:** `Upcoming` · `In Development` · `Awaiting Client` · `Awaiting Deployment` · `Completed`

**Marketing statuses:** `Upcoming` · `In Planning` · `Awaiting Client` · `Consistent Posts`

Status values are stored inside the `track_projects` JSONB column per-track (e.g. `track_projects->'Tech'->>'projectStatus'`). The overall `project_status` column is derived via `deriveOverallStatus()` and used only for sort/filter/counts — it is not displayed directly. There is no legacy fallback from `project_status` to per-track display; all data has been migrated. Do not add legacy fallback logic.

Colors for all status values are defined in `BADGE_COLORS` in `src/components/members/ui.tsx` and rendered via the `Badge` component.

### Services / filters
Active service options for businesses: `Website`, `SEO`, `Social Media`, `Graphic Design`, `Grants`.

### No unnecessary abstraction
Don't add error handling, fallbacks, or helper functions for scenarios that can't happen. Don't design for hypothetical future use. Three similar lines is fine — don't reach for abstraction prematurely.

### Security
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. Never import `supabaseAdmin.ts` from a client component or a file that might get bundled client-side.
- All API routes that mutate data verify the caller's JWT via `getAuthToken()` from `supabaseAuth.ts`.

---

## Mail domain

All four mailboxes are `@novusnyc.org` — `info@`, `ethan@`, `andrew@`,
`tahmid@` — defined once in `src/lib/mail.ts`. Never hardcode an address
elsewhere; import `EMAIL` instead.

Cloudflare Email Routing **receives** for the domain and forwards to Gmail. It
cannot send. Outbound still goes through Gmail SMTP, so two conditions must
hold or messages are rejected or spam-filed:

1. Every address is a verified "Send mail as" alias on the single Gmail account
   in `SMTP_USER` / `SMTP_PASS`. Gmail rejects an unverified sender outright
   rather than falling back to the account address.
2. SPF authorises Google as well as Cloudflare:
   `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`

Verify both before adding an address:

```bash
dig +short MX novusnyc.org; dig +short TXT novusnyc.org | grep spf1
```

One Gmail account sends for all four addresses — `src/lib/server/smtp.ts` has a
single credential pair by design. Do not reintroduce per-address SMTP
credentials; aliases are what make one account sufficient.

`voltanyc.org` still routes to the same inbox and is deliberately kept alive:
partners, BIDs and applicants from before the rebrand hold those addresses. Do
not delete that zone or its routing rules.

Some `@voltanyc.org` strings are **not** mailboxes and must never be rewritten:
`UID:...` values in calendar invites, `calendar_events.i_cal_uid` in Postgres,
and historical `audit_logs` rows, which record what happened at the time.

Social handles are migrated: `linkedin.com/company/novusnyc` and
`instagram.com/nyc.novus`, in `src/lib/social.ts`. The accounts were renamed
rather than recreated, so existing post permalinks still resolve.

---

## Deployment

- **Platform:** Vercel
- **Production domain:** `www.novusnyc.org` (www is canonical — the apex 301s to www)
- **Redirects (`next.config.mjs`):** `voltanyc.org`, `www.voltanyc.org`, `nyc.voltanpo.org`, `volta-nyc.vercel.app`, `novus-nyc.vercel.app` → `https://www.novusnyc.org`
- **Never** add `www.novusnyc.org` to that list — Vercel already 301s the apex to www, so redirecting www back to the apex creates an infinite loop.
- **Images:** served from Supabase Storage (`thzvuxuqvjkifpxlmoqc.supabase.co`), optimized as AVIF/WebP by Next.js Image.
- **Cache-busting:** run `npx next build` and deploy; Vercel invalidates CDN on deploy automatically.
- **Revalidate static pages after DB changes:** `POST /api/members/admin/revalidate` (admin-only).

---

## Security Invariants

- `supabaseAdmin.ts` has `import "server-only"` as its first line. Build fails if it's ever imported client-side.
- `SUPABASE_SERVICE_ROLE_KEY` and any private keys must never appear in client bundles or source files committed to git.
- `.gitignore` covers `*.save` and `.env*.local` — never commit credentials under any extension.
- All API routes that write or return sensitive data must call `verifyCaller()` or `getAuthToken()` + role check before touching the DB.
- If a Firebase or third-party service key is ever accidentally committed, revoke it immediately before removing from history.

---

## Auth Guard Pattern (Canonical)

The correct pattern guards render AND schedules a redirect. `useEffect`-only is prohibited because it allows a flash of data before the redirect fires.

```tsx
const { authRole, loading } = useAuth();
const router = useRouter();

useEffect(() => {
  if (!loading && authRole === "member") router.replace("/members/work");
}, [authRole, loading, router]);

if (loading || authRole === "member") return null; // or <Spinner /> inside <MembersLayout>
```

The `return null` / early render guard is **required**. The `useEffect` redirect is a fallback for navigation history. Both must be present.

---

## Leaflet / Maps Rule

All `react-leaflet` render components (`MapContainer`, `TileLayer`, `Marker`, etc.) must be loaded via `next/dynamic({ ssr: false })`. Static imports of hooks like `useMap` are fine inside components that are themselves dynamically loaded. Never import render components at the top level of a server or shared module.

---

## Tailwind Safelist Policy

Add a class to `safelist` in `tailwind.config.ts` only when it is constructed dynamically at runtime (string concatenation, lookup maps, data-driven class names) and therefore invisible to the Tailwind content scanner. Every safelisted entry must have an inline comment identifying which file builds the class string dynamically and why.

Do not safelist classes that appear as complete strings in JSX — Tailwind will scan those automatically.

---

## API Route Checklist

Before merging any new `src/app/api/` route:

- [ ] Mutating methods (`POST`, `PATCH`, `DELETE`) call `verifyCaller()` or verify JWT via `getAuthToken()`.
- [ ] Uses `getSupabaseAdmin()` (not `supabase` client) for DB writes.
- [ ] Returns `{ error: string }` with correct HTTP status on failure; `{ data }` on success.
- [ ] Does not expose raw Supabase error messages to the client.
- [ ] Input from the request body is validated (required fields present, types correct) before hitting the DB.
