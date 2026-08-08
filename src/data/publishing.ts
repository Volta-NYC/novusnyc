export interface GuideEntry {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  readTime: string;
  summary: string;
  bullets: string[];
}

export const businessGuides: GuideEntry[] = [
  {
    id: "domain-hosting-basics",
    title: "Domain and Hosting: What Small Businesses Should Actually Pay",
    date: "2026-03-11",
    readTime: "6 min read",
    summary:
      "A practical breakdown of realistic domain and hosting budgets, common upsells, and what matters before paying for anything.",
    bullets: [
      "What is normal pricing vs. overpriced for domains and hosting",
      "When shared hosting is enough and when to upgrade",
      "How to avoid lock-in and hidden renewal costs",
    ],
  },
  {
    id: "website-vs-social-first",
    title: "Website First or Social Media First? A Decision Framework",
    date: "2026-03-11",
    readTime: "5 min read",
    summary:
      "How to decide where to spend limited time and budget first, based on your business type, conversion path, and customer behavior.",
    bullets: [
      "When a website gives immediate ROI",
      "When social should be your first focus",
      "A simple 30-day execution order for both",
    ],
  },
  {
    id: "graphic-design-spend",
    title: "Graphic Design Budgeting for Local Businesses",
    date: "2026-03-11",
    readTime: "7 min read",
    summary:
      "What design work is worth paying for now, what can wait, and how to prevent expensive redesign loops.",
    bullets: [
      "Brand essentials that affect sales",
      "What to template vs. what to custom-design",
      "How to scope design work so it stays affordable",
    ],
  },
];
