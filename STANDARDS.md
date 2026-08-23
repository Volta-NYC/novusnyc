# Novus NYC — Codebase Standards

Permanent source of truth for design, component, backend, auth, and workflow patterns. Read before writing code. Supersedes ad-hoc comments and one-off decisions.

---

## 1. Design Tokens

### Color System

All colors live as CSS custom properties in `src/app/globals.css` using bare RGB channels so Tailwind opacity modifiers work (`bg-v-green/50`). **Never hardcode a hex value that has a token equivalent.**

#### Public Site Tokens (Tailwind `v-*` utilities)

| Token | Hex | Tailwind class | Use |
|---|---|---|---|
| `--color-green` | `#F6B78D` | `v-green` | Primary brand; fills, accents, active states |
| `--color-green-dark` | `#E9A77E` | `v-green-dark` | Green hover/pressed state |
| `--color-blue` | `#3B74ED` | `v-blue` | Accent blue, links |
| `--color-blue-dark` | `#2B62D9` | `v-blue-dark` | Blue hover |
| `--color-bg` | `#F7F7F2` | `v-bg` | Page background (warm off-white) |
| `--color-surface` | `#FFFFFF` | `v-card` | Cards / raised surfaces |
| `--color-dark` | `#1A1E24` | `v-dark` | Dark overlays, hero, footer |
| `--color-ink` | `#0D0D0D` | `v-ink` | Primary body text |
| `--color-muted` | `#6B7280` | `v-muted` | Secondary text |
| `--color-border` | `#E5E5DF` | `v-border` | Borders, dividers |

#### Members Portal Dark Theme

The portal does **not** have Tailwind tokens — use Tailwind arbitrary values. CSS variables are defined in `globals.css` as `--color-portal-*` for documentation purposes only.

| Variable | Hex | Purpose |
|---|---|---|
| `--color-portal-panel` (`#1C1F26`) | `bg-[#1C1F26]` | Table shells, panels, cards |
| `--color-portal-input` (`#0F1014`) | `bg-[#0F1014]` | Input / select backgrounds |
| `--color-portal-row` (`#13161D`) | `bg-[#13161D]` | Table row alternation, nested surfaces |

`MembersLayout` applies `members-portal-light` for every role, switching the portal to `bg-[#F5F6F8]` with a white sidebar. Never branch theme treatment on `authRole`.

#### Portal Green

Use `#F6B78D` (via `bg-[#F6B78D]` / `text-[#F6B78D]`) for: primary buttons, focus rings, active nav indicators, accent icons. Text on green backgrounds: `text-[#0D0D0D]`.

### Typography

| Layer | Font | How to apply |
|---|---|---|
| Headings | Space Grotesk | `font-display` |
| Body / UI text | DM Sans | `font-body` |

**Table headers:** `text-[10px] font-semibold uppercase tracking-wider text-white/40`  
**Table cells:** `text-[11px] text-white/70`  
Never use `text-xs` or `text-sm` inside portal data tables.

### Spacing & Layout

- **Portal table row height:** `h-9` (36px)
- **Modal max-width:** `max-w-2xl`
- **Page padding:** `p-4 md:p-6` (applied by `MembersLayout`)
- **Panel border-radius:** `rounded-xl` (cards), `rounded-lg` (inputs, smaller panels)
- **Page header margin:** `mb-5 md:mb-6` (applied by `PageHeader`)

---

## 2. Component Guidelines

### Shared UI Library — `src/components/members/ui.tsx`

Always import from this file for portal UI. Never create raw HTML elements in page components when a wrapper exists.

| Component | Use case | Props |
|---|---|---|
| `Btn` | All buttons | `variant`: `primary` \| `secondary` \| `danger` \| `ghost`; `size`: `sm` \| `md` |
| `Input` | Text inputs | Extends `React.InputHTMLAttributes` |
| `TextArea` | Multi-line inputs | Extends `React.TextareaHTMLAttributes` |
| `Select` | Dropdowns | `options: readonly string[]`, `emptyLabel?` |
| `SearchBar` | Search fields | `value`, `onChange`, `placeholder?` |
| `AutocompleteInput` | Single-value typeahead | `value`, `onChange`, `options` |
| `AutocompleteTagInput` | Multi-value typeahead | `values`, `onChange`, `options` |
| `TagInput` | Multi-select with list + free text | `values`, `onChange`, `options` |
| `Field` | Form label wrapper | `label`, `required?` |
| `Modal` | Overlay dialogs | `open`, `onClose`, `title` |
| `Badge` | Status/role/priority chips | `label` (maps to color automatically) |
| `StatCard` | KPI cards | `label`, `value`, `color?` |
| `PageHeader` | Page title + action area | `title`, `subtitle?`, `action?` |
| `Empty` | Empty-state placeholder | `message`, `action?` |
| `Spinner` | Loading indicator | `size?: "sm" \| "md" \| "lg"` (default `"md"`) |
| `Toggle` | Boolean toggle switch | `checked`, `onChange`, `label` |
| `Table` | Sortable data table | `cols`, `rows`, `sortCol?`, `sortDir?`, `onSort?` |
| `useConfirm` | Delete confirmation dialog | Returns `{ ask, Dialog }` |

**Rules:**
- Never use raw `<button>` in portal pages — always use `Btn`.
- Never use raw `<input type="text/email/number">` — use `Input`.
- Never use raw `<select>` — use `Select`.
- `Btn variant="primary"` replaces any button that was: `bg-[#F6B78D] text-[#0D0D0D] hover:bg-[#E9A77E]`.
- Never define a local `Loading` / spinner component in a page — import `Spinner` from `ui.tsx`.
- Never define a local `Toggle` — import from `ui.tsx`.

### Shared Constants — `src/lib/members/constants.ts`

Centralises repeated literals that pages used to define locally.

```ts
import { TRACK_META, TRACK_ORDER, TRACK_DOT, TRACK_PILL, ALL_TRACKS,
         DIVISION_PUBLIC_LABEL, BUSINESS_SERVICES, type TrackDivision } from "@/lib/members/constants";
```

| Export | Type | Contains |
|---|---|---|
| `TRACK_META` | `Record<TrackDivision, { label, chipClass, dotClass }>` | Light-theme chip + dot classes per track |
| `TRACK_DOT` | `Record<CycleTrack, string>` | Filled dot class (includes `General`) |
| `TRACK_PILL` | `Record<CycleTrack, string>` | Bordered pill class (includes `General`) |
| `TRACK_ORDER` | `TrackDivision[]` | Canonical sort order: Tech, Marketing, Finance |
| `ALL_TRACKS` | `CycleTrack[]` | `["Tech", "Marketing", "Finance"]` |
| `DIVISION_PUBLIC_LABEL` | `Record<string, string>` | Public-facing track label strings |
| `BUSINESS_SERVICES` | `readonly string[]` | Active services: Website, SEO, Social Media, Graphic Design, Grants |

### MembersLayout & Navigation

`src/components/members/MembersLayout.tsx` handles:
- Auth redirect (unauthenticated → `/members/login`)
- Deactivated account sign-out
- Path-based role redirect via `getAllowedRootsForRole()`
- Handbook acknowledgment modal (members only)
- Sidebar nav per-role

`ADMIN_NAV_ITEMS` is derived from `OWNER_NAV_ITEMS` by filtering to a known href set — do not duplicate nav item definitions.

### Building a New Portal Page

1. Wrap with `<MembersLayout>` — do not add a second `<AuthProvider>`.
2. Use `<PageHeader>` for the page title.
3. Use `subscribeX` from `storage.ts` in a `useEffect` and return the unsubscribe function.
4. If the page is admin/owner-only, `MembersLayout` will redirect unauthorised users automatically — you still may add a loading guard (`if (loading || authRole === "member") return <MembersLayout><Spinner /></MembersLayout>`).
5. Use `<Spinner />` for any async loading state; `<Spinner size="sm" />` for inline/section loading.
6. Use `<Empty>` for empty list states.
7. Use `useConfirm()` for all destructive operations (delete, reset).

---

## 3. Backend Patterns

### Data Access

All client-side data access goes through `src/lib/members/storage.ts`. **Never import `supabaseClient` or `supabaseAdmin` directly in a page component.**

```ts
// Real-time subscription (initial fetch + live updates):
useEffect(() => subscribeBusinesses(setBusinesses), []);

// One-shot reads:
const settings = await getSiteSettings();

// Mutations:
await updateBusiness(id, patch);
await deleteBusiness(id);
```

`subscribe*` functions return an unsubscribe function — always use it as the `useEffect` cleanup return value.

### DB Column Naming

- Postgres columns: `snake_case`
- TypeScript types: `camelCase`
- Conversion happens inside `storage.ts` — callers always work with camelCase types

### API Route Pattern

Server-side routes live in `src/app/api/`. All routes that mutate data or return sensitive information must verify the caller:

```ts
import { verifyCaller } from "@/lib/server/adminApi";

const check = await verifyCaller(req, ["owner", "admin"]);
if (!check.ok) return NextResponse.json({ error: check.error }, { status: check.status });
```

`verifyCaller` extracts `auth_role` from the JWT `app_metadata` and validates it against the `allowedRoles` array.

**Public routes** (no JWT): `/api/submit`, `/api/booking/*`, `/api/school-names`, `/api/public/*`

### Running Ad-Hoc SQL

```bash
npx supabase db query --linked "SELECT ..."
```

### Storage Admin Client

`src/lib/supabaseAdmin.ts` exposes the service-role client. **Server-only** — never import in client components or files that may be bundled client-side.

---

## 4. Auth Logic

### Role Hierarchy

```
owner  → Founder / Board — full portal access + admin panel
admin  → Senior Associates — elevated: projects, pods, team, email, overview
member → Standard member — own work, own pods, handbook, own profile
```

Two capabilities are derived rather than stored in `auth_role`:

- **Tech leadership** — `team.role = 'Developer'`. Opens `/members/projects` with
  full edit, and nothing else. Enforced in the database by `is_tech_lead()`.
- **LIT** — a `pod_members` row with `role = 'lit'`. Grants meetings, attendance
  and the task board *for that pod only*, via `my_led_pods()`. It is earned by
  leading a pod, never assigned as a role, and never converts to or from
  leadership.

Both leave `auth_role` at `member`.

Certified hours are stored in the append-only `certified_hour_entries` journal.
Attendance, task completion, projects and manual adjustments post correction
entries; they must never recompute or delete previously certified history.

Role is stored in `user_profiles.auth_role` and in the JWT `app_metadata.auth_role`. Read via `useAuth()` → `authRole`.

### Auth Context

```ts
const { user, userProfile, authRole, loading } = useAuth();
// user: Supabase auth user | null
// userProfile: UserProfile from DB | null
// authRole: "owner" | "admin" | "member" | null
// loading: boolean
```

### Route Access Matrix

| Route group | owner | admin | member |
|---|---|---|---|
| `/members/overview` | ✓ AdminDashboard | ✓ AdminDashboard | ✗ → `/members/me` |
| `/members/projects` | ✓ full edit | ✓ full edit | ✓ only if tech leadership |
| `/members/projects/showcase` | ✓ | ✓ | ✗ redirected (publishes to the public site) |
| `/members/pods` | ✓ all pods | ✓ all pods | ✓ own pods only |
| `/members/orgs` | ✓ full edit | ✗ redirected | ✗ redirected |
| `/members/team` | ✓ full edit | ✓ read + hours adjustments | ✗ redirected |
| `/members/applicants` | ✓ full edit | ✗ redirected | ✗ redirected |
| `/members/email` | ✓ | ✓ | ✗ redirected |
| `/members/admin` | ✓ | ✗ redirected | ✗ redirected |
| `/members/work` | ✗ redirected | ✗ redirected | ✓ |
| `/members/me` | ✗ redirected | ✗ redirected | ✓ |
| `/members/handbook` | ✗ redirected | ✗ redirected | ✓ |

### Removed routes

These were deleted when the assignment marketplace became Pods and Tech
Projects. Each 308s in `next.config.mjs` — old bookmarks and links in
already-sent email still point at them, and a 404 inside the portal reads as
lost access rather than a moved page.

| Removed | Now |
|---|---|
| `/members/assignments`, `/members/assignments/*` | `/members/pods` |
| `/members/finance-assignments` | `/members/pods` |
| `/members/work/catalog`, `/members/work/:id` | `/members/work` |
| `/members/projects/discovery` | `/members/projects?view=leads` |

The tracker's view is addressable — `?view=` accepts any key in `VIEWS`
(`all`, `domains`, `backlog`, `leads`, `hold`) — so a filtered list can be
linked to directly.

Redirects are enforced by `MembersLayout` via `getAllowedRootsForRole()`. Pages should **not** duplicate the top-level redirect — they may add a local guard only to render a loading state while auth resolves.

### API-Level Auth

Admin-only API routes additionally verify the JWT. Passing a guard at the page level is not sufficient for routes that serve sensitive data.

---

## 5. Core Workflow

### Two UIs, One Repo

- **Public site** (`/`, `/showcase`, `/apply`, etc.): light theme, `v-*` Tailwind tokens, `font-display` / `font-body`.
- **Members portal** (`/members/*`): light theme for every role via `members-portal-light`; `#F6B78D` is the primary action, `font-display` / `font-body`.
- `members-portal` CSS class on the root element triggers portal-specific global styles (`.members-portal *` selectors in `globals.css`).

### State Management

- No external state library. All data is fetched via Supabase real-time subscriptions in `useEffect`.
- Component-local `useState` for UI state (modals, forms, filters).
- No global store — pass props or lift state to the nearest common ancestor.

### Forms & Mutations

- Forms use controlled `useState` with a blank-form constant (e.g., `BLANK_FORM`).
- Mutations call `storage.ts` helpers and let the real-time subscription update the list automatically — no manual state splicing required.
- Long-running mutations disable the submit button and swap label text to `"Saving…"`.

### Performance

- Heavy portal pages (team, applicants, projects) subscribe to multiple tables; subscriptions are opened in parallel with a combined cleanup function.
- `subscribe*` callbacks take a second argument, `{ error }`. A failed query
  delivers the rows already held plus the error — never an empty array, because
  "the query failed" and "there are none" must not render identically. Pages
  show `<LoadError />` for the first and `<Empty />` for the second.
- Do not subscribe to data the page doesn't display — fetch only what you need.
- Public pages with expensive DB reads use ISR (`revalidate`) and can be refreshed via `POST /api/members/admin/revalidate`.

### CSS Class Conventions

| Pattern | Where defined | Use |
|---|---|---|
| `members-table-shell` | `globals.css` | Outer table container (bg + border + overflow) |
| `members-table-wrap` | `globals.css` | Alternative table container with explicit bg |
| `members-data-table` | `globals.css` | `<table>` inside a `members-table-wrap` |
| `members-chip` | `globals.css` | Inline status chip (non-interactive) |
| `members-icon-btn` | `globals.css` | Small square icon button (edit/delete in rows) |
| `members-icon-btn-danger` | `globals.css` | Red variant of icon button |
| `members-checkbox` | `globals.css` | Custom checkbox with green check |
| `members-status-dot` | `globals.css` | Credit-pace indicator dot |
| `members-row-actions` | `globals.css` | Inline action button group in table rows |

### Deployment

- **Platform:** Vercel — auto-deploys from `main`
- **Domain:** `novusnyc.org`
- **Image CDN:** Supabase Storage → Next.js `<Image>` (AVIF/WebP)
- **Cache busting:** `POST /api/members/admin/revalidate` after DB changes that affect public pages
- **Env secrets:** `SUPABASE_SERVICE_ROLE_KEY` is server-only — never expose to client

---

## Quick Reference: What Goes Where

| Question | Answer |
|---|---|
| New shared UI element for the portal | Add to `src/components/members/ui.tsx` |
| New constant used by 2+ portal pages | Add to `src/lib/members/constants.ts` |
| New Supabase table access | Add subscribe/CRUD functions to `src/lib/members/storage.ts` |
| New admin API endpoint | `src/app/api/members/admin/[name]/route.ts` using `verifyCaller` |
| New auth-required API endpoint | `src/app/api/members/[name]/route.ts`, verify JWT |
| New public page | `src/app/[slug]/page.tsx` — use `v-*` tokens, `font-display`/`font-body` |
| New portal page (admin) | `src/app/members/[slug]/page.tsx` — wrap with `MembersLayout`; global light remaps apply to every role |
