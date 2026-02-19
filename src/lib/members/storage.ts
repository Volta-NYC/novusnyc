// Firebase Realtime Database storage for Volta NYC members portal.
// All data is shared in real-time across all authenticated users.

import { ref, push, update, remove, onValue, get, set, off } from "firebase/database";
import { getDB } from "@/lib/firebase";

// ── DATA TYPES ────────────────────────────────────────────────────────────────

export interface BID {
  id: string;
  name: string;
  status: "Cold Outreach" | "Form Sent" | "In Conversation" | "Active Partner" | "Paused" | "Dead";
  contactName: string; contactEmail: string; phone: string;
  neighborhood: string; borough: string;
  lastContact: string; nextAction: string; nextActionDate: string;
  tourCompleted: boolean; notes: string;
  priority: "High" | "Medium" | "Low";
  referredBy: string; createdAt: string; updatedAt: string;
}

export interface Business {
  id: string; name: string; bidId: string; ownerName: string; ownerEmail: string;
  phone: string; address: string; website: string; businessType: string;
  activeServices: string[];
  projectStatus: "Not Started" | "Discovery" | "Active" | "On Hold" | "Complete";
  teamLead: string; slackChannel: string; languages: string[];
  priority: "High" | "Medium" | "Low";
  firstContactDate: string; grantEligible: boolean; notes: string;
  createdAt: string; updatedAt: string;
}

export interface Task {
  id: string; name: string;
  status: "To Do" | "In Progress" | "Blocked" | "In Review" | "Done";
  priority: "Urgent" | "High" | "Medium" | "Low";
  assignedTo: string; businessId: string;
  division: "Tech" | "Marketing" | "Finance" | "Outreach" | "Operations";
  dueDate: string; week: string; notes: string; blocker: string;
  createdAt: string; completedAt: string;
}

export interface Grant {
  id: string; name: string; funder: string; amount: string; deadline: string;
  businessIds: string[]; neighborhoodFocus: string[];
  category: "Government" | "Foundation" | "Corporate" | "CDFI" | "Other";
  status: "Researched" | "Application In Progress" | "Submitted" | "Awarded" | "Rejected" | "Cycle Closed";
  assignedResearcher: string;
  likelihood: "High" | "Medium" | "Low";
  requirements: string; applicationUrl: string; notes: string;
  cycleFrequency: "Annual" | "Biannual" | "Rolling" | "One-Time";
  createdAt: string;
}

export interface TeamMember {
  id: string; name: string; school: string; divisions: string[]; pod: string;
  role: "Team Lead" | "Member" | "Associate" | "Advisor";
  slackHandle: string; email: string;
  status: "Active" | "On Leave" | "Alumni" | "Inactive";
  skills: string[]; joinDate: string; notes: string; createdAt: string;
}

export interface Project {
  id: string; name: string; businessId: string;
  division: "Tech" | "Marketing" | "Finance" | "Operations";
  status: "Planning" | "Active" | "On Hold" | "Delivered" | "Complete";
  teamLead: string; teamMembers: string[];
  startDate: string; targetEndDate: string; actualEndDate: string;
  week1Deliverable: string; finalDeliverable: string;
  slackChannel: string; driveFolderUrl: string; clientNotes: string;
  progress: "0%" | "25%" | "50%" | "75%" | "100%";
  createdAt: string; updatedAt: string;
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function now(): string { return new Date().toISOString(); }

function snapToList<T>(snap: import("firebase/database").DataSnapshot): T[] {
  const val = snap.val();
  if (!val) return [];
  return Object.entries(val).map(([id, data]) => ({ ...(data as object), id } as T));
}

function makeSubscriber<T>(path: string) {
  return (cb: (items: T[]) => void): (() => void) => {
    const database = getDB();
    if (!database) { cb([]); return () => {}; }
    const r = ref(database, path);
    const handler = onValue(r, (snap) => cb(snapToList<T>(snap)));
    return () => off(r, "value", handler);
  };
}

// ── SUBSCRIBE (real-time listeners) ──────────────────────────────────────────

export const subscribeBIDs = makeSubscriber<BID>("bids");
export const subscribeBusinesses = makeSubscriber<Business>("businesses");
export const subscribeTasks = makeSubscriber<Task>("tasks");
export const subscribeGrants = makeSubscriber<Grant>("grants");
export const subscribeTeam = makeSubscriber<TeamMember>("team");
export const subscribeProjects = makeSubscriber<Project>("projects");

// ── BIDs ──────────────────────────────────────────────────────────────────────

export async function createBID(data: Omit<BID, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const db = getDB(); if (!db) return;
  await push(ref(db, "bids"), { ...data, createdAt: now(), updatedAt: now() });
}
export async function updateBID(id: string, data: Partial<BID>): Promise<void> {
  const db = getDB(); if (!db) return;
  await update(ref(db, `bids/${id}`), { ...data, updatedAt: now() });
}
export async function deleteBID(id: string): Promise<void> {
  const db = getDB(); if (!db) return;
  await remove(ref(db, `bids/${id}`));
}

// ── Businesses ────────────────────────────────────────────────────────────────

export async function createBusiness(data: Omit<Business, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const db = getDB(); if (!db) return;
  await push(ref(db, "businesses"), { ...data, createdAt: now(), updatedAt: now() });
}
export async function updateBusiness(id: string, data: Partial<Business>): Promise<void> {
  const db = getDB(); if (!db) return;
  await update(ref(db, `businesses/${id}`), { ...data, updatedAt: now() });
}
export async function deleteBusiness(id: string): Promise<void> {
  const db = getDB(); if (!db) return;
  await remove(ref(db, `businesses/${id}`));
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function createTask(data: Omit<Task, "id" | "createdAt">): Promise<void> {
  const db = getDB(); if (!db) return;
  await push(ref(db, "tasks"), { ...data, createdAt: now() });
}
export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  const db = getDB(); if (!db) return;
  await update(ref(db, `tasks/${id}`), data);
}
export async function deleteTask(id: string): Promise<void> {
  const db = getDB(); if (!db) return;
  await remove(ref(db, `tasks/${id}`));
}

// ── Grants ────────────────────────────────────────────────────────────────────

export async function createGrant(data: Omit<Grant, "id" | "createdAt">): Promise<void> {
  const db = getDB(); if (!db) return;
  await push(ref(db, "grants"), { ...data, createdAt: now() });
}
export async function updateGrant(id: string, data: Partial<Grant>): Promise<void> {
  const db = getDB(); if (!db) return;
  await update(ref(db, `grants/${id}`), data);
}
export async function deleteGrant(id: string): Promise<void> {
  const db = getDB(); if (!db) return;
  await remove(ref(db, `grants/${id}`));
}

// ── Team ──────────────────────────────────────────────────────────────────────

export async function createTeamMember(data: Omit<TeamMember, "id" | "createdAt">): Promise<void> {
  const db = getDB(); if (!db) return;
  await push(ref(db, "team"), { ...data, createdAt: now() });
}
export async function updateTeamMember(id: string, data: Partial<TeamMember>): Promise<void> {
  const db = getDB(); if (!db) return;
  await update(ref(db, `team/${id}`), data);
}
export async function deleteTeamMember(id: string): Promise<void> {
  const db = getDB(); if (!db) return;
  await remove(ref(db, `team/${id}`));
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const db = getDB(); if (!db) return;
  await push(ref(db, "projects"), { ...data, createdAt: now(), updatedAt: now() });
}
export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  const db = getDB(); if (!db) return;
  await update(ref(db, `projects/${id}`), { ...data, updatedAt: now() });
}
export async function deleteProject(id: string): Promise<void> {
  const db = getDB(); if (!db) return;
  await remove(ref(db, `projects/${id}`));
}

// ── EXPORT / IMPORT ───────────────────────────────────────────────────────────

export async function exportAllData(): Promise<string> {
  const db = getDB();
  if (!db) return JSON.stringify({ error: "Firebase not configured" });
  const snap = await get(ref(db, "/"));
  return JSON.stringify({ exportedAt: now(), ...snap.val() }, null, 2);
}

export async function importAllData(json: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  const data = JSON.parse(json);
  const { exportedAt, ...rest } = data;
  await set(ref(db, "/"), rest);
}
