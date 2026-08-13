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
import { NOVUS_STATS } from "./stats";
import { EMAIL } from "@/lib/mail";

// ─── Shared constants ─────────────────────────────────────────────────────────

export const TRACK_NAMES = [
  "Finance & Operations",
  "Digital & Tech",
  "Marketing & Strategy",
] as const;

export type TrackName = (typeof TRACK_NAMES)[number];

/** The track whose members pick a focus area. Matches TRACK_NAMES exactly. */
export const MARKETING_TRACK: TrackName = "Marketing & Strategy";

/**
 * Marketing's four focus areas. Applicants choose one; the same titles and
 * descriptions render on /join, so both surfaces read from here.
 */
export const MARKETING_SUBTRACKS = [
  {
    title: "Novus Social Media & Branding",
    desc: "Design social posts, manage Novus's public-facing platforms, and create promotional materials for partnering small businesses.",
  },
  {
    title: "Grants & Funding",
    desc: "Research funding opportunities, create grant templates, support grant writing, track impact, and help develop financial plans for growth.",
  },
  {
    title: "Novus Ambassadors",
    desc: "Build relationships with schools, student organizations, pipeline programs, and community partners to recruit future Novus members.",
  },
  {
    title: "Small Business Outreach",
    desc: "Find and connect with small businesses that could benefit from Novus's marketing and web services.",
  },
] as const;

export type MarketingSubtrack = (typeof MARKETING_SUBTRACKS)[number]["title"];

// ─── Homepage ─────────────────────────────────────────────────────────────────

export const homeStats = [
  { value: NOVUS_STATS.businessesServed.value, suffix: NOVUS_STATS.businessesServed.suffix, label: "Businesses Supported" },
  { value: NOVUS_STATS.nycNeighborhoods.value, suffix: NOVUS_STATS.nycNeighborhoods.suffix, label: "NYC Neighborhoods" },
  { value: NOVUS_STATS.studentMembers.value, suffix: NOVUS_STATS.studentMembers.suffix, label: "Student Members" },
  { value: NOVUS_STATS.bidPartners.value, suffix: NOVUS_STATS.bidPartners.suffix, label: "BID Partners" },
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
      "Grant writing for Novus",
      "Budgeting and financial tracking",
      "Nonprofit filings and compliance",
      "Fundraising and donor outreach",
    ],
  },
  {
    icon: CodeIcon,
    name: "Digital & Tech",
    color: "bg-blue-50 border-blue-100",
    accent: "bg-n-purple",
    iconColor: "text-n-purple",
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
    name: "Marketing",
    color: "bg-orange-50 border-orange-100",
    accent: "bg-n-orange",
    iconColor: "text-n-orange",
    iconBg: "bg-orange-100",
    items: [
      "Novus Social Media & Branding",
      "Grants & Funding",
      "Novus Ambassadors",
      "Small Business Outreach",
    ],
  },
];

export const communityPartners = [
  { name: "Manhattan Chamber of Commerce", logo: "/partners/logos/manhattan-chamber.png", website: "https://www.manhattancc.org/", important: true },
  { name: "Brooklyn Chamber of Commerce", logo: "/partners/logos/brooklyn-chamber.png", website: "https://www.brooklynchamber.com/", important: true },
  { name: "Bronx Chamber of Commerce", logo: "/partners/logos/bronx-chamber.png", website: "https://www.bronxchamber.org/", important: true },
  { name: "Staten Island Chamber of Commerce", logo: "/partners/logos/staten-island-chamber.png", website: "https://www.sichamber.com/", important: true },
  { name: "Queens Chamber of Commerce", logo: "/partners/logos/queens-chamber.png", website: "https://www.queenschamber.org/", important: true },
  { name: "NYC Small Business Services", logo: "/partners/logos/nyc-sbs.png", website: "https://www.nyc.gov/site/sbs/index.page", important: true },
  { name: "NYC Small Business Resource Network", logo: "/partners/logos/nyc-sbrn.png", website: "https://www.nycsmallbusinessresourcenetwork.org/", important: true },
  { name: "Cypress Hills Local Development Corporation", logo: "/partners/logos/cypress-hills-ldc.png", website: "https://www.cypresshills.org/", important: true },
  { name: "Bayside Village BID", logo: "/partners/logos/bayside-village-bid.png", website: "https://www.baysidevillagebid.com/", important: true },
  { name: "Forest Avenue BID", logo: "/partners/logos/forest-avenue-bid.png", website: "https://forestavenuebid.com/", important: true },
  { name: "Park Slope Fifth Avenue BID", logo: "/partners/logos/park-slope-fifth-avenue-bid.jpg", website: "https://parkslopefifthavenuebid.com/", important: true },
  { name: "Sunnyside Shines BID", logo: "/partners/logos/sunnyside-shines-bid.png", website: "https://sunnysideshines.org/", important: true },
  { name: "Greater Jamaica Development Corporation", logo: "/partners/logos/greater-jamaica-development.png", website: "https://gjdc.org/", important: false },
  { name: "Bay Ridge 5th Avenue BID", logo: "/partners/logos/bay-ridge-5th-avenue-bid.png", website: "https://www.bayridgebid.com/", important: false },
  { name: "Lower East Side Partnership", logo: "/partners/logos/lower-east-side-partnership.png", website: "https://les.nyc/", important: false },
  { name: "North Flatbush BID", logo: "/partners/logos/north-flatbush-bid.png", website: "https://www.northflatbushbid.nyc/", important: false },
  { name: "Third Avenue BID", logo: "/partners/logos/third-avenue-bid.png", website: "https://www.thirdavenuebid.org/", important: false },
  { name: "West Brighton Community Local Development Corporation", logo: "/partners/logos/west-brighton-cldc.png", website: "https://siboc.org/", important: false },
  { name: "Atlantic Avenue Local Development Corporation", logo: "/partners/logos/atlantic-avenue-ldc.png", website: "https://www.atlanticave.org/", important: false },
  { name: "Long Island City Partnership", logo: "/partners/logos/long-island-city-partnership.png", website: "https://www.longislandcityqueens.com/", important: false },
  { name: "Asian American Federation", logo: "/partners/logos/asian-american-federation.png", website: "https://www.aafederation.org/", important: false },
  { name: "Castleton Avenue Merchants Organization", logo: "/partners/logos/castleton-avenue-merchants.png", website: "https://castleton-avenue-merchant-org.vercel.app/", important: false },
  { name: "Queens Economic Development Corporation", logo: "/partners/logos/queens-economic-development.png", website: "https://www.queensny.org/", important: false },
  { name: "SIBOC", logo: "/partners/logos/siboc.png", website: "https://siboc.org/", important: false },
  { name: "East New York Merchants Association", logo: "/partners/logos/east-new-york-merchants.png", website: "https://innresebv.org/home-program-services", important: false },
];

export const marqueeSchools = [
  "Cornell University",
  "Stuyvesant High School",
  "Binghamton University",
  "Bronx High School of Science",
  "Penn State University",
  "Academy for Mathematics, Science, and Engineering",
  "Baruch College",
  "Brooklyn Technical High School",
  "University of Rochester",
  "NEST+m",
  "Stevens Institute of Technology",
  "Staten Island Technical High School",
  "International Academy East",
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
    color: "bg-n-orange",
    desc: "Social media strategy, Founder Stories content series, and Instagram account management.",
  },
  {
    name: "Higher Learning",
    type: "Tutoring Center",
    neighborhood: "Chinatown, Manhattan",
    services: ["Website", "SEO"],
    status: "In Progress",
    color: "bg-n-purple",
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
    color: "bg-fuchsia-300",
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
  { value: NOVUS_STATS.businessesServed.value, suffix: NOVUS_STATS.businessesServed.suffix, label: "Businesses helped" },
  { value: NOVUS_STATS.nycNeighborhoods.value, suffix: NOVUS_STATS.nycNeighborhoods.suffix, label: "NYC neighborhoods" },
  { value: NOVUS_STATS.studentMembers.value, suffix: NOVUS_STATS.studentMembers.suffix, label: "Student contributors" },
];

// ─── About ────────────────────────────────────────────────────────────────────

export const aboutValues = [
  {
    title: "Useful work",
    desc: "We focus on work a business can use right away, from clearer websites to stronger marketing and better internal systems.",
  },
  {
    title: "Student ownership",
    desc: "Students do the work, communicate with clients, and take responsibility for the quality of each project.",
  },
  {
    title: "Local trust",
    desc: "We work with community organizations that know their neighborhoods and the businesses within them.",
  },
  {
    title: "Clear communication",
    desc: "Every project has a defined scope, a point of contact, and regular updates from start to handoff.",
  },
];

export const aboutTimeline = [
  {
    month: "Fall",
    year: "2025",
    label: "Novus begins",
    desc: "Novus began in New York to give small businesses practical technical, marketing, and operational support while giving students meaningful project experience.",
  },
  {
    month: "Winter",
    year: "2026",
    label: "First community connections",
    desc: "We recruited our first student cohort and began reaching out to neighborhood partners, including organizations in Park Slope.",
  },
  {
    month: "Late Winter",
    year: "2026",
    label: "Meeting businesses in person",
    desc: "Students visited neighborhoods and spoke with business owners to understand where support was most useful.",
  },
  {
    month: "Spring",
    year: "2026",
    label: "First projects launch",
    desc: "Our first student teams began client projects while continuing outreach in Sunnyside, North Flatbush, Bayside, and other neighborhoods.",
  },
  {
    month: "Early Summer",
    year: "2026",
    label: "Growing local partnerships",
    desc: "We connected with NYC Small Business Services, the Small Business Resource Network, and Chambers of Commerce across the five boroughs.",
  },
  {
    month: "Summer",
    year: "2026",
    label: "Becoming Novus",
    desc: "The New York organization became Novus, with a clearer identity, updated systems, and teams built around the work we do with businesses.",
  },
  {
    month: "Fall",
    year: "2026",
    label: "Building capacity",
    desc: "We are bringing in new students, improving our systems, and preparing to support more projects during the academic year.",
  },
  {
    month: "Next",
    year: "2027",
    label: "Next steps",
    desc: "We will continue building reliable student teams and long-term partnerships with neighborhood businesses across New York City.",
    tentative: true,
  },
];

export type LeadershipMember = {
  name: string;
  role: string;
  roleDetails: string;
  email: string;
  linkedin: string;
  initial: string;
  photo?: string;
  school: string;
  grade: string;
  focus: string;
  whyNovus: string;
  interests: string[];
  highlights?: string[];
  experience: LeadershipExperience[];
};

export type LeadershipExperience = {
  title: string;
  role?: string;
  description: string;
};

export const teamMembers: LeadershipMember[] = [
  {
    name: "Ethan Zhang",
    role: "Founder & Director",
    roleDetails: "Founder and Director of Novus NYC, co-leading a 400+ student organization that has built a pipeline of 80+ small businesses across all five boroughs and delivered 100+ engagements through partnerships with NYC Small Business Services, the Small Business Resource Network, and local Business Improvement Districts.",
    email: EMAIL.ethan,
    linkedin: "https://www.linkedin.com/in/ez09",
    initial: "E",
    photo: "/team/ethan.jpeg",
    school: "Stuyvesant High School",
    grade: "Class of 2027",
    focus: "Organizational strategy, quantitative finance, technology systems, and scalable community partnerships.",
    whyNovus: "I founded Novus to give ambitious students meaningful ownership while bringing practical technology, marketing, and consulting support to the small businesses that power New York's neighborhoods.",
    interests: ["Music", "Running", "Photography", "Graphic design", "Rowing", "Classical piano"],
    highlights: [
      "1600 SAT",
      "Wharton global champion",
      "USACO Gold Division",
      "2x AIME qualifier",
      "U.S. Department of State NSLI-Y scholar",
      "Best Overall Pitch at Columbia's Young Entrepreneurs Program",
    ],
    experience: [
      {
        title: "Novus NYC",
        role: "Founder & Director",
        description: "Founded and co-directs a 400+ student organization serving small businesses across all five boroughs. Built partnerships and an 80+ business pipeline, scaled delivery to 100+ engagements, and developed the Next.js, TypeScript, and PostgreSQL platform coordinating 10+ concurrent projects.",
      },
      {
        title: "Stuyvesant Bulls",
        role: "Co-President & Competitor",
        description: "Co-led a six-person team to first place globally among 6,300+ teams in the Wharton Global High School Investment Competition. Developed a quantitative investment framework combining fundamental research, Black-Litterman allocation, multi-objective risk optimization, and a machine-learning regime classifier.",
      },
      {
        title: "Junior Economic Club",
        role: "Global Technology Officer",
        description: "Maintains web and database infrastructure for a global student economics community. Consolidated member and alumni data across 17+ chapters into a centralized directory serving 1,500+ members.",
      },
      {
        title: "Stuyvesant Study Society",
        role: "Director of Operations & Tutor",
        description: "Delivered 120+ hours of one-on-one mathematics and STEM instruction before moving into operations. Now leads outreach for 100+ K-8 students and 80+ volunteer tutors, supported by an automated Google Apps Script logistics system.",
      },
    ],
  },
  {
    name: "Andrew Chin",
    role: "Co-Founder",
    roleDetails: "Co-Founder and Executive Director, guiding organization-wide strategy, partnerships, and growth while building the systems that help student teams deliver for local businesses.",
    email: EMAIL.andrew,
    linkedin: "https://www.linkedin.com/in/andrew-chin28/",
    initial: "A",
    photo: "/team/andrew.jpg",
    school: "Stuyvesant High School",
    grade: "12th grade, Class of 2027",
    focus: "Organization-wide strategy, product delivery, partnerships, and building high-performing student teams.",
    whyNovus: "I wanted to make real technical and operational support accessible to neighborhood businesses while giving students work they can be proud to own.",
    interests: ["Bouldering", "Competitive programming", "Running", "Content creation", "Travel"],
    experience: [
      {
        title: "Google Team Edge",
        role: "Software Engineer",
        description: "Built interactive web applications, API-powered tools, and physical-computing projects with Google mentorship. Presented machine-learning transit work to audiences of up to 250 engineers.",
      },
      {
        title: "Google Code Next",
        role: "Student Engineer",
        description: "Built real-time web applications, data dashboards, and machine-learning models. Led hackathon teams and presented independent projects at Google-hosted showcases.",
      },
      { title: "NYC DOE through CS4ALL Pathfinders", role: "Software Engineering Intern", description: "Built technology for a community partner through New York City Public Schools' CS4ALL Pathfinders program." },
      { title: "StuyPulse FRC 694", role: "Software Engineer", description: "Led a 15-member subsystem team and helped earn a top-20 FIRST Championship finish." },
    ],
  },
  {
    name: "Tahmid Islam",
    role: "Director of Tech",
    roleDetails: "Leads Novus's engineering systems, developer workflows, and technical project delivery.",
    email: EMAIL.tahmid,
    linkedin: "https://www.linkedin.com/in/tahmidd2/",
    initial: "T",
    photo: "/team/tahmid.png",
    school: "Stuyvesant High School",
    grade: "12th grade, Class of 2027",
    focus: "Full-stack engineering, developer infrastructure, scalable workflows, and technical mentorship.",
    whyNovus: "Novus gives students a chance to build systems that matter beyond the classroom and helps local businesses access the technology they deserve.",
    interests: ["Binge-watching shows", "Foodie", "Roblox", "Chocolate"],
    experience: [
      { title: "MIT Beaver Works Summer Institute", role: "Research Intern", description: "Selected for Remote Sensing for Disaster Response on a full scholarship, applying machine learning to disaster-response tools." },
      { title: "NYC Public Schools through CS4ALL Pathfinders", role: "Software Engineering Intern", description: "Served as sole web developer for Destiny Helpers Outreach, architecting and launching a full-stack site." },
      { title: "StuyPulse FRC 694", role: "Software Engineer, Director of IT, and Director of Rookie Education", description: "Mentored 80+ new members, built an onboarding pipeline, and contributed robot software for regional wins and national qualifications." },
      { title: "Internyl.org", role: "Founder and Lead Developer", description: "Built an internship platform used by 100+ students with more than 1,000 opportunities." },
    ],
  },
  {
    name: "Ellie Mak",
    role: "Director of Finance and Marketing",
    roleDetails: "Leads finance and marketing strategy across Novus's student and small-business work, strengthening the systems and stories that help the organization grow.",
    email: "",
    linkedin: "https://www.linkedin.com/in/ellie-mak-4a186b3a7/",
    initial: "E",
    photo: "/team/ellie.jpg",
    school: "Stuyvesant High School",
    grade: "Class of 2026",
    focus: "Finance, marketing, operations, public speaking, and community-building.",
    whyNovus: "Novus is a way to pair thoughtful strategy with tangible support for neighborhood businesses and the communities around them.",
    interests: ["Debate", "Public speaking", "Education", "Community events", "Design"],
    experience: [
      { title: "Stuyvesant Big Sibs Program", role: "Chair", description: "Managed a $6K budget and led major schoolwide events." },
      { title: "Stuyvesant Lincoln Douglas Debate", role: "Novice Director and Varsity Debater", description: "Expanded the novice program from 5 to 45 members and led weekly instruction." },
      { title: "Stuyvesant ARISTA Honor Society", role: "Operations Committee", description: "Built schoolwide resource systems and led wellness initiatives." },
      { title: "Metis Project", role: "Math Manager", description: "Designed curriculum and supported 10 weekly tutees." },
    ],
  },
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
    desc: "Deployed websites, live social media campaigns, submitted grant applications. Work you can show in an interview.",
    color: "text-n-purple",
    bg: "bg-blue-50",
  },
  {
    icon: FolderIcon,
    title: "A portfolio that holds up",
    desc: "You can tell an interviewer exactly what you built, for which business, and what changed as a result.",
    color: "text-n-orange",
    bg: "bg-orange-50",
  },
  {
    icon: AwardIcon,
    title: "References that count",
    desc: "Your team leads and project directors know your work firsthand and can speak to it specifically.",
    color: "text-amber-500",
    bg: "bg-amber-50",
  },
  {
    icon: UsersIcon,
    title: "Feedback on your work",
    desc: "Experienced members review your work and give you direct feedback as you go.",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    icon: ArrowUpRightIcon,
    title: "Fast path to leadership",
    desc: "Strong contributors move into lead roles quickly. We promote based on work, not time.",
    color: "text-n-purple",
    bg: "bg-blue-50",
  },
  {
    icon: BuildingIcon,
    title: "Real community impact",
    desc: "The businesses you work with are real. Family-owned restaurants, flower shops, tutoring centers across NYC.",
    color: "text-n-orange",
    bg: "bg-orange-50",
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
    name: "Marketing",
    tagColor: "bg-orange-100 text-orange-800",
    outputs: [
      "Created and managed social media, branding, and promotional materials for Novus and local businesses",
      "Researched grant and funding opportunities, built templates, and supported grant writing",
      "Built relationships with schools, student organizations, pipeline programs, and community partners",
      "Connected new small businesses with Novus's marketing and web services through outreach",
      "Drafted full grant applications on behalf of client businesses",
    ],
  },
  {
    name: "Finance & Operations",
    tagColor: "bg-amber-100 text-amber-800",
    outputs: [
      "Researched and wrote grants funding Novus's own programs",
      "Built and maintained the operating budget across a full cycle",
      "Prepared nonprofit filings and compliance documentation",
      "Ran a fundraising campaign from planning through donor follow-up",
      "Produced the financial reporting partners and funders ask for",
    ],
  },
];

export const joinTracks = [
  {
    icon: BarChartIcon,
    name: "Finance & Operations",
    color: "border-n-yellow/65 bg-n-yellow/8",
    tagColor: "bg-n-yellow/50 text-n-ink",
    iconColor: "text-amber-600",
    iconBg: "bg-n-yellow/40",
    skills: [
      "Comfort reading financial documents and working in spreadsheets",
      "Some background in structured analysis or research",
      "Interest in grant research and writing",
      "Interest in nonprofit finance, accounting, or operations",
    ],
    doWhat: [
      "Research and write grants that fund Novus's own work",
      "Track the operating budget and keep spending records clean",
      "Prepare nonprofit filings and compliance paperwork",
      "Plan and run fundraising campaigns",
      "Build the financial reporting partners and funders ask for",
    ],
  },
  {
    icon: CodeIcon,
    name: "Digital & Tech",
    color: "border-n-purple/35 bg-n-purple/6",
    tagColor: "bg-n-purple/25 text-n-ink",
    iconColor: "text-n-purple-dark",
    iconBg: "bg-n-purple/25",
    skills: [
      "React.js or TypeScript, with some backend or API experience",
      "Comfortable with GitHub and basic deployment workflows",
      "Interest in working on full-stack production systems",
    ],
    doWhat: [
      "Build and launch websites for client businesses",
      "Set up backend workflows: forms, databases, auth, automations",
      "Optimize Google Maps and Yelp listings for search visibility",
      "Implement SEO improvements and accessibility fixes",
      "Deploy and maintain code in a shared production repo",
    ],
  },
  {
    icon: MegaphoneIcon,
    name: "Marketing",
    color: "border-n-orange/35 bg-n-orange/6",
    tagColor: "bg-n-orange/25 text-n-ink",
    iconColor: "text-n-orange-dark",
    iconBg: "bg-n-orange/25",
    description: "Marketing is organized into four subdepartments. Members can focus on one area or contribute across all four.",
    subdepartments: MARKETING_SUBTRACKS,
    skills: [
      "Experience with social media or content creation",
      "Design skills in Canva, Adobe, or Figma",
      "Strong writing, research, or relationship-building skills",
    ],
    doWhat: [
      "Choose one Marketing subdepartment or contribute across all four",
      "Build visible work for Novus, community partners, and local businesses",
      "Collaborate with a team on creative, research, outreach, and growth projects",
    ],
  },
];

export const joinFaqs = [
  {
    q: "Is this paid?",
    a: "No. Novus is a nonprofit and all roles are volunteer. You get real project experience, portfolio work, references, and the opportunity to move into a leadership role.",
  },
  {
    q: "What skills are helpful?",
    a: "It depends on the track. Digital & Tech work benefits from coding experience, while Finance & Operations and Marketing have roles for students building their skills.",
  },
  {
    q: "Is it remote?",
    a: "Yes. All work is remote. Some NYC members choose to join in-person client visits, but it is not required.",
  },
  {
    q: "How much time does it take?",
    a: "About 2 to 4 hours per week. Some weeks are lighter, some are busier when deadlines are close.",
  },
  {
    q: "How long is a project?",
    a: "It varies. There is no fixed semester commitment. You work on a project until it ships, then you can take on another.",
  },
  {
    q: "Can college students apply?",
    a: "Yes. We recruit from CUNY schools and colleges across the country. College students often move into team lead roles.",
  },
  {
    q: "What kinds of projects can I work on?",
    a: "Projects can include website development, social media and branding, grant and funding research, ambassador work, small business outreach, financial analysis, and neighborhood work. Your track and interests help guide your assignment.",
  },
  {
    q: "How do Marketing subdepartments work?",
    a: "Marketing has four focus areas: Novus Social Media & Branding, Grants & Funding, Novus Ambassadors, and Small Business Outreach. Members can focus on one area or contribute across all four, depending on their interests and team needs.",
  },
  {
    q: "Can I choose my track?",
    a: "Yes. You can tell us which track interests you most when you apply. We will match you based on your interests, background, and the projects currently underway.",
  },
  {
    q: "What happens after I apply?",
    a: "We review applications on a rolling basis, then invite selected students to a short conversation. We use that time to learn about your goals and answer questions about the current cohort.",
  },
  {
    q: "Will I work directly with business owners?",
    a: "Many members do. Project teams share updates with clients and some NYC members can join optional in-person visits. You will always have support from a project lead.",
  },
  {
    q: "Can I use my work in a portfolio?",
    a: "Yes, once a project is public and the client has approved it. We want members to leave with concrete work they can confidently show to future employers, schools, and collaborators.",
  },
  {
    q: "Can I stay involved after a project ends?",
    a: "Absolutely. Members can take on another project, mentor newer students, help with recruiting, or pursue leadership roles as they gain experience.",
  },
  {
    q: "Do you accept students outside New York City?",
    a: "Yes. Our work is primarily remote, so students from outside NYC can contribute. In-person opportunities are optional and currently centered in New York City.",
  },
  {
    q: "What should I include in my application?",
    a: "Tell us about your interests, relevant coursework or experience, and what you hope to learn. We care more about curiosity, follow-through, and care for community businesses than a perfect resume.",
  },
];

// ─── Partners page ────────────────────────────────────────────────────────────

export const partnerServices = [
  {
    icon: GlobeIcon,
    title: "Website Design & Development",
    desc: "Custom-built sites using modern frameworks. Mobile-friendly, accessible, and maintained.",
    color: "text-n-purple",
    bg: "bg-blue-50",
  },
  {
    icon: SmartphoneIcon,
    title: "Social Media & Content",
    desc: "Instagram strategy, posting calendars, founder interview videos, and audience growth.",
    color: "text-n-orange",
    bg: "bg-orange-50",
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
    color: "text-n-purple",
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
