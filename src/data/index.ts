import {
  BarChartIcon,
  CodeIcon,
  MegaphoneIcon,
  MonitorIcon,
  FolderIcon,
  AwardIcon,
  ArrowUpRightIcon,
  BuildingIcon,
  UsersIcon,
  GlobeIcon,
  SmartphoneIcon,
  DollarIcon,
  SearchIcon,
  TrendingUpIcon,
  CreditCardIcon,
} from "@/components/Icons";
import { VOLTA_STATS, formatStat } from "./stats";

// ─── Shared constants ─────────────────────────────────────────────────────────

export const TRACK_NAMES = [
  "Finance & Operations",
  "Digital & Tech",
  "Marketing & Strategy",
] as const;

export type TrackName = (typeof TRACK_NAMES)[number];

// ─── Homepage ─────────────────────────────────────────────────────────────────

export const homeStats = [
  { value: VOLTA_STATS.businessesServed.value, suffix: VOLTA_STATS.businessesServed.suffix, label: "Businesses Supported" },
  { value: VOLTA_STATS.nycNeighborhoods.value, suffix: VOLTA_STATS.nycNeighborhoods.suffix, label: "NYC Neighborhoods" },
  { value: VOLTA_STATS.studentMembers.value, suffix: VOLTA_STATS.studentMembers.suffix, label: "Student Members" },
  { value: VOLTA_STATS.bidPartners.value, suffix: VOLTA_STATS.bidPartners.suffix, label: "BID Partners" },
];

export const homeTracks = [
  {
    icon: BarChartIcon,
    name: "Finance & Operations",
    color: "bg-amber-50 border-amber-100",
    accent: "bg-amber-400",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-100",
    items: [
      "Grant research & writing",
      "Sales & revenue analysis",
      "Competitor benchmarking",
      "Owner-facing report writing (see /guides)",
    ],
  },
  {
    icon: CodeIcon,
    name: "Digital & Tech",
    color: "bg-blue-50 border-blue-100",
    accent: "bg-v-blue",
    iconColor: "text-v-blue",
    iconBg: "bg-blue-100",
    items: [
      "Website design & development",
      "Backend workflows (forms, DB, auth)",
      "SEO & Google Maps visibility",
      "Web accessibility (ADA)",
      "Production deployment & iteration",
    ],
  },
  {
    icon: MegaphoneIcon,
    name: "Marketing & Strategy",
    color: "bg-lime-50 border-lime-100",
    accent: "bg-v-green",
    iconColor: "text-v-green",
    iconBg: "bg-lime-100",
    items: [
      "Social media management",
      "Founder storytelling & video",
      "Content creation & strategy",
      "Audience growth analytics",
    ],
  },
];

export const marqueeSchools = [
  "Stuyvesant High School",
  "Brooklyn Technical High School",
  "The Brooklyn Latin School",
  "Manhattan Hunter Science High School",
  "Staten Island Technical High School",
  "Marriott's Ridge High School",
  "Skyline High School",
  "Seminole High School",
  "South Brunswick High School",
  "Virtual Virginia Academy",
  "Seattle VocTech",
  "Spain Park High School",
  "Burlingame High School",
  "Rouse High School",
  "North Forsyth High School",
  "Prosper High School",
  "Bard High School Early College",
  "Cornell University",
  "Binghamton University",
  "Hunter College",
  "Baruch College",
];

// ─── Projects ─────────────────────────────────────────────────────────────────

export type ProjectStatus = "In Progress" | "Active" | "Upcoming";

export interface Project {
  name: string;
  type: string;
  neighborhood: string;
  services: string[];
  status: ProjectStatus;
  color: string;
  desc: string;
  url?: string;   // live website or social media link — add when available
  quote?: string; // client testimonial — add when available
}

export const projects: Project[] = [
  {
    name: "Petite Dumpling",
    type: "Restaurant",
    neighborhood: "Park Slope, Brooklyn",
    services: ["Website", "Social Media"],
    status: "In Progress",
    color: "bg-orange-400",
    desc: "Website improvement project for Petite Dumpling in Park Slope, with support for stronger social media consistency.",
  },
  {
    name: "Anatolico",
    type: "Turkish Home Goods",
    neighborhood: "Park Slope, Brooklyn",
    services: ["Social Media"],
    status: "Active",
    color: "bg-v-green",
    desc: "Social media strategy, Founder Stories content series, and Instagram account management.",
  },
  {
    name: "Higher Learning",
    type: "Tutoring Center",
    neighborhood: "Chinatown, Manhattan",
    services: ["Website", "SEO"],
    status: "In Progress",
    color: "bg-v-blue",
    desc: "Website build and SEO setup with Cantonese/Mandarin language support for a Chinatown tutoring center.",
  },
  {
    name: "The Painted Pot",
    type: "Pottery Studio",
    neighborhood: "Park Slope, Brooklyn",
    services: ["SEO", "Google Visibility"],
    status: "Active",
    color: "bg-amber-400",
    desc: "Google Maps optimization, SEO audit, and social media strategy for a Park Slope pottery studio.",
  },
  {
    name: "Juliette Floral Design",
    type: "Flower Shop",
    neighborhood: "Park Slope, Brooklyn",
    services: ["Website"],
    status: "Upcoming",
    color: "bg-pink-400",
    desc: "Website redesign and online ordering setup for a 5th Avenue floral boutique.",
  },
  {
    name: "Bayaal",
    type: "African Home Goods",
    neighborhood: "Park Slope, Brooklyn",
    services: ["Website", "Social Media"],
    status: "Upcoming",
    color: "bg-purple-400",
    desc: "Website clarity improvements and Founder Stories social media content.",
  },
];

/** The 3 active/in-progress projects shown on the homepage. */
export const currentProjects = projects
  .filter((p) => p.status !== "Upcoming")
  .slice(0, 3);

// ─── Showcase ─────────────────────────────────────────────────────────────────

export const showcaseStats = [
  { value: VOLTA_STATS.businessesServed.value, suffix: VOLTA_STATS.businessesServed.suffix, label: "Businesses helped" },
  { value: VOLTA_STATS.nycNeighborhoods.value, suffix: VOLTA_STATS.nycNeighborhoods.suffix, label: "NYC neighborhoods" },
  { value: VOLTA_STATS.studentMembers.value, suffix: VOLTA_STATS.studentMembers.suffix, label: "Student contributors" },
];

// ─── About ────────────────────────────────────────────────────────────────────

export const aboutValues = [
  {
    title: "Equity-first",
    desc: "We focus on neighborhoods and businesses that don't have the resources to hire consultants or the capacity to manage everything on their own. Our goal is to broaden what's possible by showing new opportunities for growth and efficiency.",
  },
  {
    title: "Student-led",
    desc: "Every project, from initial outreach to final delivery, is led by our diverse team from across the five boroughs.",
  },
  {
    title: "Community-rooted",
    desc: "We work through local BIDs and community organizations because trust in a neighborhood takes time to build. We show up in person, learn the context behind each business, and stay engaged through the full project lifecycle.",
  },
  {
    title: "Transparent",
    desc: "Every project comes with a defined scope, clear timelines, and regular check-ins. Business owners always know who is on their team, what's being worked on, and when to expect deliverables.",
  },
];

export const aboutTimeline = [
  {
    month: "Nov",
    year: "2025",
    label: "NYC branch launched",
    desc: "Volta NYC is established, beginning outreach to Business Improvement Districts across Brooklyn and Queens.",
  },
  {
    month: "Jan",
    year: "2026",
    label: "First NYC projects",
    desc: "First website and social media projects kick off — Petite Dumpling, Higher Learning, and Anatolico.",
  },
  {
    month: "Spring",
    year: "2026",
    label: "Spring Cohort — NYC",
    desc: `Cohort expands to ${formatStat(VOLTA_STATS.studentMembers)} students across ${formatStat(VOLTA_STATS.nycNeighborhoods)} NYC neighborhoods, with active projects in Park Slope, Sunnyside, Chinatown, and Long Island City.`,
  },
  {
    month: "Summer",
    year: "2026",
    label: "Deeper engagements",
    desc: "Volta expands into longer-term client engagements, structured in-person neighborhood tours, and exploratory paid internship tracks for returning members.",
  },
];

export const teamMembers = [
  { name: "Ethan Zhang", role: "Executive Director & Founder", email: "ethan@voltanyc.org", initial: "E", desc: "", photo: "/team/ethan.jpeg" },
  { name: "Andrew Chin", role: "Executive Director", email: "andrew@voltanyc.org", initial: "A", desc: "", photo: "/team/andrew.jpg" },
  { name: "Tahmid Islam", role: "Director of Tech", email: "islamtahmidd@gmail.com", initial: "T", desc: "", photo: "/team/tahmid.png" },
  { name: "Joseph Long", role: "Co-Director of Outreach", email: "joseph.long.nyc@gmail.com", initial: "J", desc: "", photo: "/team/joseph.jpg" },
  { name: "Jean-Pierre Proulx", role: "Co-Director of Marketing", email: "jppfinster@gmail.com", initial: "JP", desc: "", photo: "/team/jp.jpg" },
  { name: "Kaia Talathi", role: "Co-Director of Marketing", email: "31kaia.talathi@gmail.com", initial: "K", desc: "", photo: "/team/kaia.jpg" },
];

export const branches = [
  { city: "Jacksonville", state: "FL" },
  { city: "New York City", state: "NY" },
  { city: "Bay Area", state: "CA" },
  { city: "Atlanta", state: "GA" },
  { city: "Alexandria", state: "VA" },
  { city: "Dallas", state: "TX" },
];

// ─── Join page ────────────────────────────────────────────────────────────────

export const joinGains = [
  {
    icon: MonitorIcon,
    title: "Real deliverables",
    desc: "Deployed websites, live social media campaigns, submitted grant applications — work you can point to.",
    color: "text-v-blue",
    bg: "bg-blue-50",
  },
  {
    icon: FolderIcon,
    title: "A portfolio that holds up",
    desc: "Tell interviewers exactly what you built, for which business, and what the result was.",
    color: "text-v-green",
    bg: "bg-lime-50",
  },
  {
    icon: AwardIcon,
    title: "References that count",
    desc: "Work directly with project directors and team leads who can speak to your specific contributions.",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: UsersIcon,
    title: "Mentorship",
    desc: "Get guidance from experienced team leads and project directors throughout your time at Volta.",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    icon: ArrowUpRightIcon,
    title: "Fast path to leadership",
    desc: "Strong contributors move into team lead and pod manager roles quickly — we always need more of them.",
    color: "text-v-blue",
    bg: "bg-blue-50",
  },
  {
    icon: BuildingIcon,
    title: "Real community impact",
    desc: "The businesses you help are real — family-owned restaurants, flower shops, tutoring centers across NYC.",
    color: "text-v-green",
    bg: "bg-lime-50",
  },
];

export const trackHighlights = [
  {
    name: "Digital & Tech",
    tagColor: "bg-blue-100 text-blue-800",
    outputs: [
      "Built and launched websites for NYC businesses from scratch",
      "Implemented backend features for forms, scheduling, and database sync",
      "Implemented bilingual support for Chinese-speaking communities",
      "Optimized Google Maps and Yelp listings for search visibility",
      "Deployed production code across multiple active client repos",
    ],
  },
  {
    name: "Marketing & Strategy",
    tagColor: "bg-lime-100 text-lime-800",
    outputs: [
      "Managed live Instagram accounts for active client businesses",
      "Produced original Founder Stories video content series",
      "Built content calendars and audience growth strategies",
      "Ran analytics and iterated campaigns based on real engagement data",
    ],
  },
  {
    name: "Finance & Operations",
    tagColor: "bg-amber-100 text-amber-800",
    outputs: [
      "Researched grant opportunities for NYC nonprofits and small businesses",
      "Analyzed sales and revenue data to identify growth opportunities",
      "Ran competitor analysis and market benchmarking",
      "Wrote practical owner reports on execution priorities and operating costs",
      "Drafted full grant applications on behalf of client businesses",
    ],
  },
];

export const joinTracks = [
  {
    icon: BarChartIcon,
    name: "Finance & Operations",
    color: "border-amber-300 bg-amber-50",
    tagColor: "bg-amber-100 text-amber-800",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-100",
    skills: [
      "Comfort reading financial and tax documents",
      "Strong spreadsheet and structured-analysis skills",
      "Grant writing or research experience (preferred, not required)",
      "Interest in finance, accounting, or nonprofit work",
    ],
    doWhat: [
      "Research and write grant applications for small businesses",
      "Analyze sales and revenue data",
      "Run competitor analysis and market benchmarking",
      "Write practical business reports for owners (see /guides)",
      "Support nonprofit financial filings and documentation",
    ],
  },
  {
    icon: CodeIcon,
    name: "Digital & Tech",
    color: "border-blue-300 bg-blue-50",
    tagColor: "bg-blue-100 text-blue-800",
    iconColor: "text-v-blue",
    iconBg: "bg-blue-100",
    skills: [
      "React.js/TypeScript with some backend or API experience",
      "Familiarity with GitHub and deployment workflows",
      "Interest in full-stack development and production systems",
    ],
    doWhat: [
      "Build and launch websites for client businesses",
      "Build backend workflows (forms, databases, auth, automations)",
      "Set up and optimize Google Maps and Yelp listings",
      "Implement SEO improvements and web accessibility",
      "Deploy and manage code in a shared GitHub repo",
    ],
  },
  {
    icon: MegaphoneIcon,
    name: "Marketing & Strategy",
    color: "border-lime-300 bg-lime-50",
    tagColor: "bg-lime-100 text-lime-800",
    iconColor: "text-v-green",
    iconBg: "bg-lime-100",
    skills: [
      "Social media or content creation experience",
      "Design skills (Canva, Adobe, Figma)",
      "Strong writing and communication",
    ],
    doWhat: [
      "Manage Instagram accounts for real businesses",
      "Develop content strategies and posting calendars",
      "Film and edit founder interview content",
      "Run analytics and audience growth campaigns",
    ],
  },
];

export const joinFaqs = [
  {
    q: "Is this paid?",
    a: "No — Volta is a nonprofit and all positions are volunteer. You gain experience, portfolio work, mentorship, references, and leadership opportunities.",
  },
  {
    q: "Do I need prior experience?",
    a: "It depends on the track. Tech requires some coding experience. Finance and marketing are more open to students still developing their skills.",
  },
  {
    q: "Is it remote?",
    a: "Yes. All work is remote-friendly. Some NYC members may choose to do in-person client visits, but it's not required.",
  },
  {
    q: "How much time does it take?",
    a: "2–4 hours per week, depending on the project phase. Some weeks are lighter, some are heavier around deliverable deadlines.",
  },
  {
    q: "How long is a project?",
    a: "Projects are ongoing and vary in scope. There's no fixed contract or semester commitment. You work on a project until it's delivered.",
  },
  {
    q: "Can college students apply?",
    a: "Yes. We actively recruit from CUNY schools and other NYC colleges. College students often move into team lead roles.",
  },
];

// ─── Partners page ────────────────────────────────────────────────────────────

export const partnerServices = [
  {
    icon: GlobeIcon,
    title: "Website Design & Development",
    desc: "Custom-built sites using modern frameworks. Mobile-friendly, accessible, and maintained.",
    color: "text-v-blue",
    bg: "bg-blue-50",
  },
  {
    icon: SmartphoneIcon,
    title: "Social Media & Content",
    desc: "Instagram strategy, posting calendars, founder interview videos, and audience growth.",
    color: "text-v-green",
    bg: "bg-lime-50",
  },
  {
    icon: DollarIcon,
    title: "Grant Research & Writing",
    desc: "We find grants your business qualifies for and help prepare the full application.",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: SearchIcon,
    title: "SEO & Online Visibility",
    desc: "Google Maps optimization, Yelp, Apple Maps, and search engine improvements.",
    color: "text-v-blue",
    bg: "bg-blue-50",
  },
  {
    icon: TrendingUpIcon,
    title: "Sales & Financial Analysis",
    desc: "Sales and revenue analysis, competitor benchmarking, pricing strategy, and owner-facing reporting.",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: CreditCardIcon,
    title: "Digital Payment Setup",
    desc: "Help transitioning from cash-only to digital, setting up loyalty programs and online ordering.",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
];
