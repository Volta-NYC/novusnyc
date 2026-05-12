# Volta NYC — Members Portal

Volta NYC is a student-led, pro-bono consulting organization providing free digital services to small businesses across New York City. This repository contains two tightly coupled products:

- **Public website** — marketing site, project showcase, partner inquiry, student application, and interview booking at [voltanyc.org](https://voltanyc.org)
- **Members portal** — private dark-themed dashboard at `/members/*` for managing assignments, clients, applicants, team operations, and internal email

---

## Getting Started

### Prerequisites

- **Node.js 20+** and **npm 10+**
- A **Supabase project** (Postgres + Auth + Storage + Realtime) — [supabase.com](https://supabase.com)
- **Supabase CLI** for schema migrations: `npm install -g supabase`

### 1. Clone and install

```bash
git clone https://github.com/Volta-NYC/voltanyc.git
cd voltanyc
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in all values — see [Environment Variables](#environment-variables) below.

### 3. Apply database migrations

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build — runs TypeScript, ESLint, and page compilation |
| `npm run lint` | ESLint only |
| `npm start` | Serve a production build locally |
| `npx supabase db query --linked "SQL"` | Run SQL against the linked Supabase project |

---

## Environment Variables

See `.env.example` for descriptions. Keys required to run the app:

```env
# ── Supabase ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=         # Server-only. Never expose to the browser.

# ── Public site ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=              # e.g. https://voltanyc.org
NEXT_PUBLIC_APPS_SCRIPT_URL=       # Google Apps Script URL for form logging

# ── Outgoing email (SMTP via Gmail) ──────────────────────────────────────────
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EMAIL_REPLY_TO=
TEAM_EMAIL_ALLOWED_FROM=           # Comma-separated allowed "from" addresses

# ── Secondary SMTP (optional, for per-person aliases) ────────────────────────
SMTP_HOST_SECONDARY=
SMTP_USER_SECONDARY=
SMTP_PASS_SECONDARY=
SMTP_SECONDARY_FROM_ADDRESSES=

# ── Interview emails (separate SMTP account) ──────────────────────────────────
INTERVIEW_EMAIL_SMTP_HOST=
INTERVIEW_EMAIL_SMTP_USER=
INTERVIEW_EMAIL_SMTP_PASS=
INTERVIEW_FROM_EMAIL=
INTERVIEW_EMAIL_REPLY_TO=
INTERVIEW_ZOOM_LINK=

# ── Rate limiting (server-side abuse guardrails) ──────────────────────────────
FORM_RATE_LIMIT_PER_IP=
FORM_RATE_LIMIT_PER_EMAIL=
FORM_RATE_LIMIT_WINDOW_SEC=
RESUME_UPLOAD_RATE_LIMIT_PER_IP=
RESUME_UPLOAD_RATE_LIMIT_WINDOW_SEC=
SIGNUP_RATE_LIMIT_PER_IP=
SIGNUP_RATE_LIMIT_PER_EMAIL=
SIGNUP_RATE_LIMIT_WINDOW_SEC=
BOOKING_RATE_LIMIT_PER_IP=
BOOKING_RATE_LIMIT_PER_EMAIL=
BOOKING_RATE_LIMIT_WINDOW_SEC=

# ── Misc ──────────────────────────────────────────────────────────────────────
GOOGLE_GEOCODING_API_KEY=          # BID partner geocoding
DRIVE_FOLDER_ID=                   # Google Drive folder for resume uploads (optional)
RESUME_UPLOAD_MAX_MB=
```

---

## Project Structure

```
voltanyc/
├── public/                         # Static assets (images, favicons, og image)
│
├── supabase/
│   └── migrations/                 # Versioned SQL schema migrations
│
└── src/
    ├── app/                        # Next.js App Router
    │   ├── layout.tsx              # Root layout — fonts, Vercel Analytics, Navbar
    │   ├── globals.css             # Design tokens (CSS custom properties) + base styles
    │   ├── page.tsx                # Home page
    │   │
    │   ├── showcase/               # Public project showcase with map + filters
    │   ├── about/                  # Mission, history, team
    │   ├── partners/               # BID partner inquiry form
    │   ├── apply/                  # Student application
    │   ├── join/                   # Student recruitment landing
    │   ├── book/                   # Interview booking (public, token-based)
    │   ├── impact/                 # Impact statistics
    │   ├── updates/                # Progress updates feed
    │   ├── reports/                # Public reports
    │   │
    │   ├── members/                # Members portal (auth-gated, dark theme)
    │   │   ├── layout.tsx          # Wraps all /members/* in <AuthProvider>
    │   │   ├── login/              # Email/password login
    │   │   ├── signup/             # Invite-code account creation
    │   │   ├── overview/           # Member dashboard
    │   │   ├── me/                 # Personal profile settings
    │   │   ├── handbook/           # Member handbook
    │   │   │
    │   │   ├── projects/           # Business/client management (admin)
    │   │   │   └── page.tsx        # Businesses, Discovery, Showcase tabs
    │   │   │
    │   │   ├── assignments/        # Assignment management
    │   │   │   ├── by-business/    # Assignments grouped by client
    │   │   │   ├── catalog/        # Flat sortable list of all assignments
    │   │   │   ├── for-review/     # Admin review queue for submitted claims
    │   │   │   └── templates/      # Reusable assignment blueprints ("Create + Templates")
    │   │   │
    │   │   ├── work/               # Member's assigned work
    │   │   │   └── [id]/           # Individual assignment detail
    │   │   │
    │   │   ├── team/               # Team directory
    │   │   │   └── infractions/    # Strike/infraction management (admin)
    │   │   │
    │   │   ├── bids/               # BID partner pipeline CRM (admin)
    │   │   ├── email/              # Bulk email composer with template picker (admin)
    │   │   ├── finance-assignments/# Finance track assignment tracker
    │   │   ├── applicants/         # Application review (admin)
    │   │   │   └── interviews/     # Interview scheduling and evaluations
    │   │   └── admin/              # Admin control panel (owner-only)
    │   │
    │   └── api/                    # Server-side API routes
    │       ├── members/            # Portal: auth, invite codes, email, export, upload
    │       ├── booking/            # Interview booking, Zoom, reminder emails
    │       ├── submit/             # Public inquiry form handler
    │       ├── showcase-image/     # Cached image proxy for showcase cards
    │       └── og/                 # Open Graph image generation
    │
    ├── components/
    │   ├── members/                # Portal-specific components (dark theme)
    │   │   ├── ui.tsx              # Design system: Btn, Modal, Field, Input, Select, Badge, SearchBar, Empty, useConfirm
    │   │   ├── MembersLayout.tsx   # Portal shell with sidebar navigation
    │   │   ├── SectionTabs.tsx     # Tab navigation + tab-group exports
    │   │   ├── RichTextEditor.tsx  # Tiptap editor with forwardRef/insertAtCursor
    │   │   ├── MemberOverview.tsx  # Member summary card (assignments, credits, status)
    │   │   ├── MemberDrawer.tsx    # Slide-out member detail panel
    │   │   └── AdminCycleOverview.tsx # Admin cycle stats widget
    │   │
    │   ├── Navbar.tsx              # Public site sticky nav (mobile menu)
    │   ├── Footer.tsx              # Public site footer
    │   ├── AnimatedSection.tsx     # Framer Motion scroll-reveal wrapper
    │   ├── NeighborhoodMap.tsx     # Leaflet map for project/BID locations
    │   ├── MasonryGrid.tsx         # Masonry card grid for showcase
    │   ├── ApplicationForm.tsx     # Student application form
    │   └── Icons.tsx               # Inline SVG icon components
    │
    └── lib/
        ├── supabaseClient.ts       # Anon Supabase client singleton (browser-safe)
        ├── supabaseAdmin.ts        # Service-role admin client (server only)
        ├── site.ts                 # NEXT_PUBLIC_SITE_URL constant
        │
        ├── members/
        │   ├── storage.ts          # All data types + realtime subscriptions + CRUD
        │   ├── authContext.tsx      # <AuthProvider> + useAuth() hook
        │   ├── supabaseAuth.ts     # signIn / signOut / resetPassword / getAuthToken
        │   ├── emailDispatch.ts    # Outbound email composition helpers
        │   ├── cycleCompute.ts     # Grade/credit computation logic
        │   └── cycleAutomation.ts  # Automated cycle state transitions
        │
        └── server/
            ├── adminApi.ts         # Admin user management (invite, deactivate)
            ├── smtp.ts             # Nodemailer SMTP wrappers (primary + secondary)
            ├── publicShowcase.ts   # Server-side showcase data fetch
            ├── applicantEmails.ts  # Accept/reject email templates
            ├── interviewEmail.ts   # Interview invite/reminder emails
            └── rateLimit.ts        # In-memory IP/email rate limiter
```

---

## Architecture Notes

### Auth roles

| Role | Who | Access |
|---|---|---|
| `owner` | Founder / board | Unrestricted — all admin actions |
| `admin` | Senior Associates | Elevated — manage assignments, applicants, email |
| `member` | Standard members | View portal, claim assignments, track own work |

Auth state is exposed everywhere inside `/members/*` via:

```ts
const { user, userProfile, authRole, loading } = useAuth();
```

### Database

Supabase Postgres is the single source of truth. All client-side data access goes through `src/lib/members/storage.ts`. The pattern for realtime subscriptions:

```ts
useEffect(() => subscribeBusinesses(setBusinesses), []);
//              └── returns unsubscribe fn, used as cleanup
```

Each `subscribe*` function performs an initial fetch then keeps the UI live via a Supabase Realtime channel.

Server-side routes use `getSupabaseAdmin()` from `supabaseAdmin.ts`, which bypasses Row-Level Security. **Never import it in client components.**

### Two Supabase clients

| Client | Key used | Where |
|---|---|---|
| `supabaseClient.ts` | Anon key | Browser components, `storage.ts` |
| `supabaseAdmin.ts` | Service-role key | API routes, server components only |

### Design tokens

All brand colors are defined as bare RGB channels in `globals.css :root` and exposed as Tailwind utilities via `tailwind.config.ts`. This allows opacity modifiers to work: `bg-v-green/50`.

The portal uses a separate dark palette (`#0D0F14` → `#13161D` → `#111418`) not covered by the `v-*` tokens — these appear as hardcoded hex values in portal components, which is intentional.

---

## Deployment

The app deploys automatically to **[voltanyc.org](https://voltanyc.org)** via Vercel on every push to `main`. `next.config.ts` handles 301 redirects from `www.voltanyc.org` and legacy domains.

To apply database schema changes after deployment, run migrations against the linked Supabase project:

```bash
npx supabase db push
```
