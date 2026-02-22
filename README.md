# Volta NYC — voltanyc.org

Next.js website for Volta's NYC branch. Deployable to Vercel.

> **Domain note:** The old domain `nyc.voltanpo.org` (old domain, redirects to voltanyc.org) now 301-redirects to `voltanyc.org`. The primary canonical domain is `voltanyc.org`.

---

## Before You Deploy — Two Things to Fill In

### 1. Student Application Form URL
In `src/app/join/page.tsx`, line 4:
```ts
const GOOGLE_FORM_URL = "https://forms.google.com/YOUR_FORM_LINK";
```
Replace with your actual Google Form URL.

**How to create the Google Form:**
- Go to forms.google.com → New Form
- Add fields: Name, Email, School, Grade/Year, Track (Finance/Tech/Marketing), Short answer prompt, Resume upload (File upload type)
- Under Settings → Responses → link to a Google Sheet for automatic tracking
- Copy the share link and paste it above

### 2. Business Contact Form (Formspree)
In `src/components/ContactForm.tsx`, line 30:
```ts
const FORMSPREE_ENDPOINT = "https://formspree.io/f/YOUR_FORMSPREE_ID";
```
Replace with your Formspree endpoint.

**How to set up Formspree:**
- Go to formspree.io → Sign up (free)
- Create a new form → set email to `volta.newyork@gmail.com`
- Copy the form ID (looks like `xabc1234`)
- Replace `YOUR_FORMSPREE_ID` with that ID

### 3. Logo
The logo is already copied to `public/logo.png`. If you update the logo, replace that file.

---

## Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open http://localhost:3000

---

## Deploying to Vercel

### Step 1 — Create a GitHub repo

1. Go to github.com → New repository
2. Name it `volta-nyc`
3. Set to Private (recommended)
4. Don't add README (you already have one)

### Step 2 — Push code to GitHub

Open Terminal in your project folder and run:

```bash
git init
git add .
git commit -m "Initial commit — Volta NYC website"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/volta-nyc.git
git push -u origin main
```

Replace `YOUR_GITHUB_USERNAME` with your GitHub username.

### Step 3 — Deploy on Vercel

1. Go to vercel.com → Sign up or log in (use GitHub)
2. Click "Add New Project"
3. Import your `volta-nyc` repo from GitHub
4. Vercel auto-detects Next.js — no config needed
5. Click Deploy
6. Your site goes live — add your custom domain in the next step

### Step 4 — DNS setup for voltanyc.org

**Primary domain:** `voltanyc.org`
**www redirect:** `www.voltanyc.org` → redirects to `voltanyc.org` (handled by `next.config.mjs`)
**Old domain:** `nyc.voltanpo.org` (old domain, redirects to voltanyc.org) — 301-redirects to `voltanyc.org` via `next.config.mjs`

**On Vercel:**
1. Go to your project → Settings → Domains
2. Add `voltanyc.org` as your primary domain
3. Also add `www.voltanyc.org` — Vercel or `next.config.mjs` handles the redirect
4. Vercel will show you DNS records to add

**On your DNS provider (wherever voltanyc.org is managed):**
1. Add an `A` record pointing `voltanyc.org` → Vercel's IP (shown in the Vercel dashboard)
2. Or add a `CNAME` record: `www` → `cname.vercel-dns.com`

DNS changes take 5–30 minutes to propagate.

**Environment variable on Vercel:**
Set `NEXT_PUBLIC_SITE_URL=https://voltanyc.org` in Vercel → Settings → Environment Variables (it already defaults to this value, but setting it explicitly is recommended).

---

## Project Structure

```
volta-nyc/
├── public/
│   └── logo.png              ← Volta lightning bolt logo
├── src/
│   ├── app/
│   │   ├── globals.css       ← Global styles, dot grid, marquee
│   │   ├── layout.tsx        ← Root layout with fonts and navbar
│   │   ├── sitemap.ts        ← Auto-generated sitemap (uses SITE_URL)
│   │   ├── robots.ts         ← Robots.txt (uses SITE_URL)
│   │   ├── page.tsx          ← Home page
│   │   ├── showcase/
│   │   │   └── page.tsx      ← BID partners + business clients
│   │   ├── join/
│   │   │   └── page.tsx      ← Student application page
│   │   ├── partners/
│   │   │   └── page.tsx      ← Business/BID inquiry + contact form
│   │   └── about/
│   │       └── page.tsx      ← Mission, history, team
│   ├── components/
│   │   ├── Navbar.tsx         ← Sticky nav, mobile menu
│   │   ├── Footer.tsx         ← Links, contact
│   │   ├── AnimatedSection.tsx← Scroll-reveal wrapper (Framer Motion)
│   │   ├── CountUp.tsx        ← Animated number counter
│   │   └── ContactForm.tsx    ← Business inquiry form (Formspree)
│   └── lib/
│       ├── site.ts            ← SITE_URL constant (reads NEXT_PUBLIC_SITE_URL)
│       └── ...
├── tailwind.config.ts         ← Custom colors: v-green, v-blue, v-bg, v-ink
├── next.config.mjs            ← Host-based redirects for old domains
├── package.json
└── tsconfig.json
```

---

## Updating Content

### Adding a new business to the showcase
In `src/app/showcase/page.tsx`, add to the `businesses` array:
```ts
{ name: "Business Name", type: "Type", neighborhood: "Neighborhood", services: ["Website"], status: "active" },
```

### Adding a new BID partner
In `src/app/showcase/page.tsx`, add to `bidPartners`:
```ts
{ name: "BID Name", borough: "Queens" },
```

### Updating stats numbers
In `src/app/page.tsx`, update the `stats` array values.
In `src/app/showcase/page.tsx`, update `bigNumbers`.

### Adding project case studies
When a project is complete, add a detailed entry in the showcase page.
Include: business name, what was built, before/after, a quote from the owner if possible.

---

## Colors (Tailwind custom classes)

| Class | Color | Use |
|-------|-------|-----|
| `bg-v-green` / `text-v-green` | #85CC17 | Primary CTAs, accents, stats |
| `bg-v-blue` / `text-v-blue` | #2562EC | Secondary CTAs, links |
| `bg-v-bg` | #F7F7F2 | Page background |
| `text-v-ink` | #0D0D0D | Body text |
| `text-v-muted` | #6B7280 | Secondary text |
| `bg-v-dark` | #111110 | Dark sections |

---

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS** (custom config)
- **Framer Motion** (animations)
- **Formspree** (contact form → email)
- **Google Forms** (student applications → Google Sheets)
- **Vercel** (hosting)

---

## Goal 3 — Internal Systems

The website currently handles goals 1 (proof of concept) and 2 (student applications).

For **internal project/member tracking** (goal 3), the recommendation is to keep using Notion as set up separately. A future authenticated `/dashboard` section can be added later using **Supabase** (free tier) for a database + auth layer. This is a meaningful addition that would require a separate development sprint.
