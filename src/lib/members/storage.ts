// ── DATA TYPES ────────────────────────────────────────────────────────────────

export interface BID {
  id: string;
  name: string;
  status: "Cold Outreach" | "Form Sent" | "In Conversation" | "Active Partner" | "Paused" | "Dead";
  contactName: string;
  contactEmail: string;
  phone: string;
  neighborhood: string;
  borough: string;
  lastContact: string;
  nextAction: string;
  nextActionDate: string;
  tourCompleted: boolean;
  notes: string;
  priority: "High" | "Medium" | "Low";
  referredBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  name: string;
  bidId: string;
  ownerName: string;
  ownerEmail: string;
  phone: string;
  address: string;
  website: string;
  businessType: string;
  activeServices: string[];
  projectStatus: "Not Started" | "Discovery" | "Active" | "On Hold" | "Complete";
  teamLead: string;
  slackChannel: string;
  languages: string[];
  priority: "High" | "Medium" | "Low";
  firstContactDate: string;
  grantEligible: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  name: string;
  status: "To Do" | "In Progress" | "Blocked" | "In Review" | "Done";
  priority: "Urgent" | "High" | "Medium" | "Low";
  assignedTo: string;
  businessId: string;
  division: "Tech" | "Marketing" | "Finance" | "Outreach" | "Operations";
  dueDate: string;
  week: string;
  notes: string;
  blocker: string;
  createdAt: string;
  completedAt: string;
}

export interface Grant {
  id: string;
  name: string;
  funder: string;
  amount: string;
  deadline: string;
  businessIds: string[];
  neighborhoodFocus: string[];
  category: "Government" | "Foundation" | "Corporate" | "CDFI" | "Other";
  status: "Researched" | "Application In Progress" | "Submitted" | "Awarded" | "Rejected" | "Cycle Closed";
  assignedResearcher: string;
  likelihood: "High" | "Medium" | "Low";
  requirements: string;
  applicationUrl: string;
  notes: string;
  cycleFrequency: "Annual" | "Biannual" | "Rolling" | "One-Time";
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  school: string;
  divisions: string[];
  pod: string;
  role: "Team Lead" | "Member" | "Associate" | "Advisor";
  slackHandle: string;
  email: string;
  status: "Active" | "On Leave" | "Alumni" | "Inactive";
  skills: string[];
  joinDate: string;
  notes: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  businessId: string;
  division: "Tech" | "Marketing" | "Finance" | "Operations";
  status: "Planning" | "Active" | "On Hold" | "Delivered" | "Complete";
  teamLead: string;
  teamMembers: string[];
  startDate: string;
  targetEndDate: string;
  actualEndDate: string;
  week1Deliverable: string;
  finalDeliverable: string;
  slackChannel: string;
  driveFolderUrl: string;
  clientNotes: string;
  progress: "0%" | "25%" | "50%" | "75%" | "100%";
  createdAt: string;
  updatedAt: string;
}

// ── GENERIC CRUD HELPERS ──────────────────────────────────────────────────────

function getStore<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}
function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}
function genId(): string { return crypto.randomUUID(); }
function now(): string { return new Date().toISOString(); }

// ── BIDs ──────────────────────────────────────────────────────────────────────

const BID_KEY = "volta_bids";
export const getBIDs = (): BID[] => getStore<BID>(BID_KEY);
export const saveBIDs = (d: BID[]) => setStore(BID_KEY, d);
export const createBID = (data: Omit<BID, "id" | "createdAt" | "updatedAt">): BID => {
  const record = { ...data, id: genId(), createdAt: now(), updatedAt: now() } as BID;
  saveBIDs([...getBIDs(), record]);
  return record;
};
export const updateBID = (id: string, data: Partial<BID>): void =>
  saveBIDs(getBIDs().map((r) => (r.id === id ? { ...r, ...data, updatedAt: now() } : r)));
export const deleteBID = (id: string): void => saveBIDs(getBIDs().filter((r) => r.id !== id));

// ── Businesses ────────────────────────────────────────────────────────────────

const BIZ_KEY = "volta_businesses";
export const getBusinesses = (): Business[] => getStore<Business>(BIZ_KEY);
export const saveBusinesses = (d: Business[]) => setStore(BIZ_KEY, d);
export const createBusiness = (data: Omit<Business, "id" | "createdAt" | "updatedAt">): Business => {
  const record = { ...data, id: genId(), createdAt: now(), updatedAt: now() } as Business;
  saveBusinesses([...getBusinesses(), record]);
  return record;
};
export const updateBusiness = (id: string, data: Partial<Business>): void =>
  saveBusinesses(getBusinesses().map((r) => (r.id === id ? { ...r, ...data, updatedAt: now() } : r)));
export const deleteBusiness = (id: string): void => saveBusinesses(getBusinesses().filter((r) => r.id !== id));

// ── Tasks ─────────────────────────────────────────────────────────────────────

const TASK_KEY = "volta_tasks";
export const getTasks = (): Task[] => getStore<Task>(TASK_KEY);
export const saveTasks = (d: Task[]) => setStore(TASK_KEY, d);
export const createTask = (data: Omit<Task, "id" | "createdAt">): Task => {
  const record = { ...data, id: genId(), createdAt: now() } as Task;
  saveTasks([...getTasks(), record]);
  return record;
};
export const updateTask = (id: string, data: Partial<Task>): void =>
  saveTasks(getTasks().map((r) => (r.id === id ? { ...r, ...data } : r)));
export const deleteTask = (id: string): void => saveTasks(getTasks().filter((r) => r.id !== id));

// ── Grants ────────────────────────────────────────────────────────────────────

const GRANT_KEY = "volta_grants";
export const getGrants = (): Grant[] => getStore<Grant>(GRANT_KEY);
export const saveGrants = (d: Grant[]) => setStore(GRANT_KEY, d);
export const createGrant = (data: Omit<Grant, "id" | "createdAt">): Grant => {
  const record = { ...data, id: genId(), createdAt: now() } as Grant;
  saveGrants([...getGrants(), record]);
  return record;
};
export const updateGrant = (id: string, data: Partial<Grant>): void =>
  saveGrants(getGrants().map((r) => (r.id === id ? { ...r, ...data } : r)));
export const deleteGrant = (id: string): void => saveGrants(getGrants().filter((r) => r.id !== id));

// ── Team ──────────────────────────────────────────────────────────────────────

const TEAM_KEY = "volta_team";
export const getTeam = (): TeamMember[] => getStore<TeamMember>(TEAM_KEY);
export const saveTeam = (d: TeamMember[]) => setStore(TEAM_KEY, d);
export const createTeamMember = (data: Omit<TeamMember, "id" | "createdAt">): TeamMember => {
  const record = { ...data, id: genId(), createdAt: now() } as TeamMember;
  saveTeam([...getTeam(), record]);
  return record;
};
export const updateTeamMember = (id: string, data: Partial<TeamMember>): void =>
  saveTeam(getTeam().map((r) => (r.id === id ? { ...r, ...data } : r)));
export const deleteTeamMember = (id: string): void => saveTeam(getTeam().filter((r) => r.id !== id));

// ── Projects ──────────────────────────────────────────────────────────────────

const PROJ_KEY = "volta_projects";
export const getProjects = (): Project[] => getStore<Project>(PROJ_KEY);
export const saveProjects = (d: Project[]) => setStore(PROJ_KEY, d);
export const createProject = (data: Omit<Project, "id" | "createdAt" | "updatedAt">): Project => {
  const record = { ...data, id: genId(), createdAt: now(), updatedAt: now() } as Project;
  saveProjects([...getProjects(), record]);
  return record;
};
export const updateProject = (id: string, data: Partial<Project>): void =>
  saveProjects(getProjects().map((r) => (r.id === id ? { ...r, ...data, updatedAt: now() } : r)));
export const deleteProject = (id: string): void => saveProjects(getProjects().filter((r) => r.id !== id));

// ── EXPORT / IMPORT ───────────────────────────────────────────────────────────

export function exportAllData(): string {
  return JSON.stringify({
    exportedAt: now(),
    bids: getBIDs(),
    businesses: getBusinesses(),
    tasks: getTasks(),
    grants: getGrants(),
    team: getTeam(),
    projects: getProjects(),
  }, null, 2);
}

export function importAllData(json: string): void {
  const data = JSON.parse(json);
  if (data.bids) saveBIDs(data.bids);
  if (data.businesses) saveBusinesses(data.businesses);
  if (data.tasks) saveTasks(data.tasks);
  if (data.grants) saveGrants(data.grants);
  if (data.team) saveTeam(data.team);
  if (data.projects) saveProjects(data.projects);
}
