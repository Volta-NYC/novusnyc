# Volta NYC — Full Organization Brief + Website Overhaul Prompt
> Share this entire file with Claude Code. It contains everything needed to redesign the website with full creative discretion.

---

## WHO WE ARE

**Volta NYC** is a registered 501(c)(3) nonprofit organization run entirely by high school and college students. We place student teams on real consulting projects for New York City small businesses — completely free of charge. We are not a club, not a class, not a program with a fixed semester. We are a functioning organization that delivers professional-grade work.

We are young (NYC branch launched November 2025), but we operate with the seriousness of a consultancy and the values of a community organization. Our credibility comes from the work, not from institutional backing.

---

## THE EXCHANGE (critical to communicate clearly)

This is the core of how Volta works and it must be communicated without making either side feel patronized:

- **Businesses get:** free websites, social media management, grant research & writing, SEO, financial analysis, digital payment setup — professional work with no cost and no catch
- **Students get:** hands-on experience with real clients, portfolio-worthy deliverables, mentorship from team leads and directors, a path to leadership roles, and the ability to make a real difference in their community
- **We are upfront about this exchange.** Businesses are often suspicious of "free" — so we explain clearly that students want the experience and the portfolio proof. There are no hidden fees, no data collection, no marketing use of their business. The labor is the value we provide; the credibility is the value we receive.

---

## WHAT WE DO — THREE SERVICE TRACKS

### 1. Digital & Tech
- Custom website design and development (Next.js, React, modern frameworks)
- SEO and Google Maps / Yelp / Apple Maps optimization
- ADA web accessibility compliance
- GitHub-based deployment and maintenance
- **We look for:** React/TypeScript experience, GitHub familiarity

### 2. Finance & Operations
- Grant research and full application writing
- Sales data and POS system analysis
- Transaction fee reduction and payment optimization
- Operational consulting and financial documentation
- **We look for:** comfort with financial documents, interest in nonprofit finance or accounting

### 3. Marketing & Strategy
- Instagram and social media management
- Content strategy and posting calendars
- Founder interview video production and editing
- Audience growth analytics
- **We look for:** content creation experience, design skills (Canva, Figma, Adobe), strong writing

---

## OUR STRUCTURE

**Leadership (NYC):**
- Ethan Zhang — Director | ethan@voltanpo.org | Stuyvesant High School
- Andrew Chin — Director | andrew@voltanpo.org | Stuyvesant High School
- Joseph Long — Assistant Director | joseph.long.nyc@gmail.com | Stuyvesant High School
- Tahmid Islam — Tech Lead | islamtahmidd@gmail.com | Stuyvesant High School

**General contact:** volta.newyork@gmail.com
**LinkedIn:** https://www.linkedin.com/company/volta-nyc/
**Website:** nyc.voltanpo.org

**Roles system (for members portal):**
- Admin — full access, manages keys and users
- Project Lead — can edit projects and assign tasks
- Member — can view and update their assigned work
- Viewer — read-only

**Team size:** 3–5 students per project, organized into pods by neighborhood
**Time commitment:** 2–4 hours/week, project-based, no fixed semester or contract
**Member composition:** ~80+ students, mix of high school and college (CUNY and others)

---

## HISTORY & SCALE

**Timeline:**
- April 2025 — Florida branch founded (Jacksonville)
- November 2025 — NYC branch launched
- December 2025 — First NYC projects begin
- Spring 2026 — Active cohort, 80+ members, 9 neighborhoods

**Florida branch stats:** 30+ businesses served including OPA Behavioral Health, Persis Indian Grill, Sun City Sustenance, 30+ food trucks and local stores

**National presence:** Jacksonville FL, Bay Area CA, Atlanta GA, Virginia VA, Dallas TX, New York City NY

**NYC stats:**
- 20+ businesses actively served
- 9 neighborhoods
- 80+ student members
- 3 service tracks
- 8+ BID (Business Improvement District) relationships

---

## NYC NEIGHBORHOODS WE SERVE
Park Slope (Brooklyn), Sunnyside (Queens), Chinatown (Manhattan), Long Island City (Queens), Cypress Hills (Brooklyn), Flatbush (Brooklyn), Flushing (Queens), Mott Haven (Bronx), Bayside (Queens)

---

## ACTIVE / RECENT PROJECTS (examples)
- **Souk Al Shater** — Lebanese restaurant, Sunnyside Queens → Website
- **Anatolico** — Turkish home goods, Park Slope Brooklyn → Social media
- **Higher Learning** — Tutoring center, Chinatown Manhattan → Website

---

## PARTNER ORGANIZATIONS
We work through local BIDs (Business Improvement Districts) and community organizations to reach businesses. We have relationships with 8+ BIDs across NYC. BIDs refer businesses to us and we coordinate neighborhood-level operations through them.

---

## TECH STACK (current website)
- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Animations:** Framer Motion
- **Fonts:** Space Grotesk (display) + DM Sans (body)
- **Form handling:** Formspree (ID: xkovzkwz)
- **Deployment:** Vercel → nyc.voltanpo.org
- **Repo:** github.com/voltanyc/volta-nyc
- **Logo:** /public/logo.png (high-res PNG, transparent background)

**Color palette:**
- Green (primary accent): #85CC17
- Blue: #3B74ED
- Background (off-white): #F7F7F2
- Ink (near-black): #0D0D0D
- Muted text: #6B7280
- Border: #E5E5DF
- Dark sections: #111110

**Members portal:** `/members` — fully client-side, localStorage-based auth. No backend. Weekly access keys, role-based permissions, 6 internal databases (Projects, Businesses, Tasks, BID Tracker, Grant Library, Team Directory). Bootstrap admin key: `VOLTA_ADMIN_2026`

---

## CURRENT PAGE STRUCTURE
- `/` — Home
- `/join` — For students (tracks, what you gain, FAQs)
- `/apply` — Standalone application form (linked from /join)
- `/partners` — For businesses (multilingual contact form: EN/ES/ZH/KO/AR/FR)
- `/about` — Organization history, values, team, national reach
- `/showcase` — Our Work (operational proof)
- `/impact` — Impact page (institutional proof — exists but NOT linked in navbar yet, needs real data/photos)
- `/contact` — Team cards + general inquiry form
- `/members` — Internal portal (password protected via weekly access keys)

---

## COPY PRINCIPLES (things to preserve or improve)

**Avoid:**
- AI-sounding three-part catchphrases ("Every project ships. Every deliverable is real.")
- Emojis — use custom SVG icons instead
- "Real skills" / "fake portfolios" framing — it sounds condescending
- "Submit grant applications" → use "win grants"
- "Published content" (past tense) → "publish content" or better: "build social communities"
- "This is the model" (pretentious)
- Anything that sounds patronizing toward businesses receiving free help
- Assumptions of skepticism ("no strings attached") — just explain the exchange clearly

**Preserve:**
- Directness and confidence — we don't over-explain
- The Volta green (#85CC17) as the signature color
- Parallax hero animation (VOLTA / NYC scales up and flies off on scroll)
- The dark section aesthetic for stats/mission blocks

---

## WEBSITE OVERHAUL BRIEF FOR CLAUDE CODE

You are rebuilding the Volta NYC website from scratch with significant creative discretion. Keep the color palette and font system (Space Grotesk + DM Sans). Everything else is open to reimagination.

**Goal:** Make Volta look like a legitimate, serious, respected organization — not a student project. Think of how a top nonprofit or boutique consultancy presents itself. The website should make a BID director, a grant committee, a school administrator, and a high school student all feel like this is worth their time.

### Creative directions to explore and implement:

**1. Interactive neighborhood map**
Build an interactive map of NYC showing which neighborhoods we operate in, with dots for each business we've worked with. Clicking a dot could show the business name, type, and what service we delivered. Consider using Leaflet.js or Mapbox GL. The map should be a centerpiece of the Our Work / Showcase page.

**2. Homepage redesign**
The hero should feel bold and editorial — not a startup landing page. Consider a full-bleed typographic treatment. The parallax "VOLTA / NYC" scaling effect should stay. The dual CTA (students vs. businesses) should feel like two distinct invitations, not one generic prompt split in two.

**3. BID/partner logos or name display**
Even just displaying the names of the BIDs and neighborhoods we work with in an organized, intentional way reads as institutional credibility. A "Trusted by" / "Active in" section with neighborhood names styled like partner logos.

**4. Stats that feel earned**
20+ businesses, 9 neighborhoods, 80+ students, 6 cities nationwide. These numbers should hit. Not small text under a counter. Make them a statement.

**5. The "For Businesses" page**
Should feel like a pitch deck slide, not a FAQ page. The exchange should be explained like a partnership, not charity. The multilingual contact form (EN/ES/ZH/KO/AR/FR) is a genuine differentiator — surface it as such ("We work in your language").

**6. Student-facing pages**
Students are the lifeblood of the org. The /join and /apply pages should feel like applying to something selective and worth it — not filling out a form. Show what you walk away with. Make mentorship prominent. Real project screenshots when available.

**7. Timeline / history visualization**
The org history (FL 2025 → NYC 2025 → now → 6 cities) could be a horizontal scrolling timeline or an animated vertical one. It signals growth and momentum.

**8. Impact page (build it properly but don't link in navbar yet)**
This page is for sponsors, donors, grant committees, and school administrators. It needs: outcome data, testimonials from business owners, neighborhood reach map, recognitions. Build the structure; we'll fill in real data and photos later. Mark placeholder sections clearly.

**9. Members portal (/members)**
Already built — keep it. It uses weekly access keys with role-based permissions. Make sure the login/signup flow is clean and the sidebar navigation works on mobile.

**10. Footer**
Simple. Logo (big). Nav links. Two contact buttons: email (linked) and LinkedIn (linked). That's it.

### What NOT to do:
- Don't add a chatbot or AI assistant widget
- Don't use stock photo placeholders if they look generic — use abstract color fills or typography instead
- Don't make the site look like a university organization page
- Don't over-animate — every animation should have a purpose
- Don't use emojis anywhere — SVG icons only
- Don't put the Impact page in the navbar yet

### Technical notes:
- Formspree endpoint: https://formspree.io/f/xkovzkwz
- Keep the members portal at /members with the existing auth system
- Keep the /apply route as a separate page from /join
- The logo is /public/logo.png — never replace with a different image, just reference this path
- Vercel auto-deploys on push to main branch of github.com/voltanyc/volta-nyc
