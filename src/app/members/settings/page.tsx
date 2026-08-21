"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import { Btn } from "@/components/members/ui";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeTeam, updateTeamMember,
  type TeamMember,
} from "@/lib/members/storage";

function normalizeKey(v: string): string {
  return String(v ?? "").trim().toLowerCase();
}

export default function SettingsPage() {
  const { user, userProfile, authRole, loading } = useAuth();
  const router = useRouter();

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (authRole === "owner" || authRole === "admin")) {
      router.replace("/members/projects");
    }
  }, [loading, authRole, router]);

  useEffect(() => subscribeTeam(setTeam), []);

  const me = useMemo(() => {
    const email = normalizeKey(userProfile?.email ?? user?.email ?? "");
    if (!email) return null;
    return team.find(
      (m) => normalizeKey(m.email) === email || normalizeKey(m.alternateEmail ?? "") === email,
    ) ?? null;
  }, [team, user, userProfile]);

  useEffect(() => {
    if (me) setDisplayName(me.name);
  }, [me]);

  if (loading || authRole === "owner" || authRole === "admin") return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!me) return;
    const trimmed = displayName.trim();
    if (!trimmed) return;
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateTeamMember(me.id, { name: trimmed });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MembersLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <header>
          <h1 className="font-display font-bold text-black text-2xl">Account Settings</h1>
          <p className="text-black/50 text-sm mt-1">Manage how you appear in the portal.</p>
        </header>

        <section className="rounded-2xl border border-black/8 bg-white shadow-sm p-5">
          <h2 className="text-[10px] uppercase tracking-wider text-black/40 font-semibold mb-4">Profile</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="settings-display-name" className="block text-[10px] uppercase tracking-wider text-black/40 font-semibold mb-1.5">Display Name</label>
              <input
                id="settings-display-name"
                className="w-full bg-white border border-black/12 rounded-lg px-3 py-2.5 text-sm text-black/85 placeholder-black/30 focus:outline-none focus:border-[#F6B78D]/60 transition-colors"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <label htmlFor="settings-email" className="block text-[10px] uppercase tracking-wider text-black/40 font-semibold mb-1.5">Email</label>
              <input
                id="settings-email"
                className="w-full bg-black/4 border border-black/8 rounded-lg px-3 py-2.5 text-sm text-black/50 cursor-not-allowed"
                value={userProfile?.email ?? user?.email ?? ""}
                readOnly
                disabled
              />
              <p className="text-[11px] text-black/40 mt-1">
                To change your email, contact an admin.
              </p>
            </div>

            {(me?.divisions?.length ?? 0) > 0 && (
              <div>
                <label htmlFor="settings-divisions" className="block text-[10px] uppercase tracking-wider text-black/40 font-semibold mb-1.5">Division(s)</label>
                <input
                  id="settings-divisions"
                  className="w-full bg-black/4 border border-black/8 rounded-lg px-3 py-2.5 text-sm text-black/50 cursor-not-allowed"
                  value={(me?.divisions ?? []).join(", ")}
                  readOnly
                  disabled
                />
              </div>
            )}

            {me?.role && (
              <div>
                <label htmlFor="settings-role" className="block text-[10px] uppercase tracking-wider text-black/40 font-semibold mb-1.5">Role</label>
                <input
                  id="settings-role"
                  className="w-full bg-black/4 border border-black/8 rounded-lg px-3 py-2.5 text-sm text-black/50 cursor-not-allowed"
                  value={me.role}
                  readOnly
                  disabled
                />
              </div>
            )}

            {saveError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                {saveError}
              </p>
            )}

            {saved && (
              <p className="text-sm text-[#8B5E48] bg-[#F6B78D]/8 border border-[#F6B78D]/25 rounded-xl px-4 py-2.5">
                Saved successfully.
              </p>
            )}

            <div className="flex justify-end pt-1">
              <Btn type="submit" variant="primary" disabled={saving || !displayName.trim()}>
                {saving ? "Saving…" : "Save changes"}
              </Btn>
            </div>
          </form>
        </section>
      </div>
    </MembersLayout>
  );
}
