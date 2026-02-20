# Volta NYC — Claude Code Memory

## Project overview

Nonprofit website + internal members portal. Students run consulting projects for NYC small businesses (websites, social media, grants). Public site markets the org; members portal is a private CRM dashboard.

- **Live URL:** https://nyc.voltanpo.org
- **Repo root:** `volta-nyc/` (one level inside `nichetuffwebsite/`)
- **Deployed on:** Vercel (auto-deploys on push to `main`)

---

## Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + custom CSS (`globals.css`) |
| Animations | Framer Motion |
| Database | Firebase Realtime Database (members portal only) |
| Forms | Formspree (`xkovzkwz`) |
| Auth | localStorage password check (`src/lib/members/auth.ts`) |
| Fonts | Space Grotesk (display), DM Sans (body) — Google Fonts via `next/font` |

---

## Folder layout

```
src/
├── app/                      # Next.js App Router pages
│   ├── layout.tsx            # Root layout — fonts, metadata, ConditionalLayout
│   ├── globals.css           # Global styles — dot grid, marquee, .volta-input, .tag, .project-card
│   ├── page.tsx              # Homepage
│   ├── join/page.tsx         # Student recruitment
│   ├── apply/page.tsx        # Application form wrapper
│   ├── partners/page.tsx     # For businesses (with multilingual ContactForm)
│   ├── showcase/page.tsx     # Project portfolio
│   ├── about/page.tsx        # Team, timeline, values
│   ├── contact/page.tsx      # Team contacts + InquiryForm
│   └── members/              # Private portal (no Navbar/Footer)
│       ├── login/page.tsx
│       ├── dashboard/page.tsx
│       ├── projects/page.tsx
│       ├── businesses/page.tsx
│       ├── tasks/page.tsx
│       ├── bids/page.tsx
│       ├── grants/page.tsx
│       ├── team/page.tsx
│       └── admin/page.tsx
│
├── components/
│   ├── Navbar.tsx            # Sticky header, mobile hamburger
│   ├── Footer.tsx            # Dark footer
│   ├── HeroSection.tsx       # Homepage hero with parallax
│   ├── AnimatedSection.tsx   # Scroll-reveal wrapper (Framer Motion whileInView)
│   ├── CountUp.tsx           # Animated number counter
│   ├── Icons.tsx             # 24 custom SVG icons (named exports)
│   ├── ConditionalLayout.tsx # Wraps Navbar+Footer; hides on /members routes
│   ├── ContactForm.tsx       # Multilingual business inquiry (6 languages, Formspree)
│   ├── ApplicationForm.tsx   # Student application with optional resume upload
│   ├── InquiryForm.tsx       # General contact form
│   └── members/
│       ├── MembersLayout.tsx # Dark sidebar layout + auth check
│       └── ui.tsx            # Members UI primitives
│
├── data/
│   └── index.ts             # ★ ALL page data lives here (stats, projects, tracks,
│                            #   team, FAQs, etc.) — import from here, never inline
│
└── lib/
    ├── firebase.ts           # Firebase init (lazy — only if env vars set)
    ├── formspree.ts          # FORMSPREE_ENDPOINT constant
    ├── schemas.ts            # Form validation (validateContactForm, validateApplicationForm,
    │                         #   validateInquiryForm) — returns { success, errors }
    └── members/
        ├── auth.ts           # Password auth (localStorage)
        └── storage.ts        # Firebase CRUD + real-time subscribers for all 6 entity types
```

---

## Design system

**Brand colors** (Tailwind custom names):

| Name | Hex | Usage |
|------|-----|-------|
| `v-green` | `#85CC17` | Primary accent, CTAs |
| `v-green-dark` | `#6aaa10` | Hover state for green |
| `v-blue` | `#3B74ED` | Secondary accent, links |
| `v-blue-dark` | `#2B62D9` | Hover state for blue |
| `v-bg` | `#F7F7F2` | Page background (off-white) |
| `v-ink` | `#0D0D0D` | Primary text |
| `v-muted` | `#6B7280` | Secondary text |
| `v-border` | `#E5E5DF` | Borders, dividers |
| `v-dark` | `#111110` | Dark sections (stats bg, footer) |

**Typography:**
- `font-display` → Space Grotesk (headings, buttons, bold labels)
- `font-body` → DM Sans (body text, form labels)

**Reusable CSS classes** (defined in `globals.css`):
- `.volta-input` — form field (white bg, border, focus:border-v-green)
- `.tag` — pill badge (small rounded label)
- `.project-card` — card with hover lift effect
- `.dot-grid` — background dot pattern
- `.marquee-track` — scrolling marquee (pauses on hover)

**Responsive heading sizes:** use `style={{ fontSize: "clamp(Xrem, Yvw, Zrem)" }}` for large display headings.

---

## Key conventions

### Data — always centralize
All arrays used in pages (stats, projects, team, FAQs, track info, etc.) live in **`src/data/index.ts`**. Never define them inline inside page files. Import what you need:
```ts
import { homeStats, projects, teamMembers } from "@/data";
```

The `currentProjects` export is derived automatically:
```ts
export const currentProjects = projects.filter(p => p.status !== "Upcoming").slice(0, 3);
```

### Forms — validation + endpoint
- Endpoint: import `FORMSPREE_ENDPOINT` from `@/lib/formspree` (never hardcode it in components)
- Validation: import the relevant `validate*` function from `@/lib/schemas`
- Pattern: call validator on submit → if `!result.success` set field errors and return early → clear errors on success
- Field error display: `{errors.fieldName && <p className="text-red-500 text-xs mt-1 font-body">{errors.fieldName}</p>}`
- Add `border-red-400` class to invalid inputs
- Clear individual field errors as user types: `clearError("fieldName")`
- Use `noValidate` on `<form>` to disable browser native validation

### Animations
- Wrap sections in `<AnimatedSection>` for scroll-reveal (`direction="left"|"right"|"up"`, `delay={i * 0.1}`)
- Use `<CountUp end={N} suffix="+">` for animated stat numbers

### Members portal
- All `/members/*` routes skip Navbar/Footer (handled by `ConditionalLayout`)
- Auth is localStorage-based: `isAuthenticated()` from `@/lib/members/auth`
- Firebase data: use `subscribe*` functions for real-time listeners — always unsubscribe on unmount
- Members pages use `MembersLayout` wrapper from `@/components/members/MembersLayout`

### Icon usage
Import named icon components from `@/components/Icons`:
```tsx
import { BarChartIcon, CodeIcon, MapPinIcon } from "@/components/Icons";
// Usage: <BarChartIcon className="w-6 h-6 text-v-blue" />
```

### Path alias
`@/` maps to `src/`. Always use `@/` for imports (never relative paths from deep files).

---

## Environment variables

Required for members portal Firebase (set in `.env.local`, never commit):
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```
Firebase is lazy-loaded — the public site works without any env vars set.

---

## Common tasks

**Add a new public page:**
1. Create `src/app/[slug]/page.tsx`
2. Add any page-specific data to `src/data/index.ts`
3. Add nav link in `src/components/Navbar.tsx`

**Add a new project to the portfolio:**
Edit the `projects` array in `src/data/index.ts`. Projects with `status: "In Progress"` or `"Active"` auto-appear on the homepage (first 3). All projects appear on `/showcase`.

**Update team members:**
Edit `teamMembers` in `src/data/index.ts`. The same data is used on `/about` and `/contact`.

**Update stats:**
- Homepage (4 stats): `homeStats` in `src/data/index.ts`
- Showcase (3 stats): `showcaseStats` in `src/data/index.ts`

**Add a new form field with validation:**
1. Add field to the `Values` interface in `src/lib/schemas.ts`
2. Add validation logic to the relevant `validate*` function
3. Add input + error display in the component

**Modify marquee schools:**
Edit `marqueeSchools` array in `src/data/index.ts`.

---

## Dev workflow

```bash
# From volta-nyc/ directory:
npm run dev       # localhost:3000
npm run build     # production build check
npm run lint      # ESLint
```

Push to `main` → Vercel auto-deploys.
