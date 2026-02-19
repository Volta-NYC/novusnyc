"use client";

import { useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { exportAllData, importAllData } from "@/lib/members/storage";

export default function AdminPage() {
  const [status, setStatus] = useState("");
  const [importing, setImporting] = useState(false);

  const handleExport = async () => {
    setStatus("Exporting…");
    const json = await exportAllData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `volta-data-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Export complete.");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setStatus("Reading file…");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        await importAllData(ev.target?.result as string);
        setStatus("Import complete. Data is now live for everyone.");
      } catch {
        setStatus("Import failed — check that the file is valid JSON from a Volta export.");
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <MembersLayout>
      <div className="mb-6">
        <h1 className="font-display font-bold text-white text-2xl">Data Management</h1>
        <p className="text-white/40 text-sm mt-1">Export or import all portal data. Changes apply to everyone in real-time.</p>
      </div>

      <div className="max-w-lg space-y-4">
        <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
          <h2 className="font-display font-bold text-white mb-1">Export Data</h2>
          <p className="text-white/40 text-sm mb-4">Download a JSON backup of all projects, businesses, tasks, BIDs, grants, and team members.</p>
          <button onClick={handleExport}
            className="bg-[#85CC17] text-[#0D0D0D] font-display font-bold px-5 py-2.5 rounded-xl hover:bg-[#72b314] transition-colors text-sm">
            Download Backup
          </button>
        </div>

        <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
          <h2 className="font-display font-bold text-white mb-1">Import Data</h2>
          <p className="text-white/40 text-sm mb-4">
            <strong className="text-orange-400">Warning:</strong> This will overwrite all existing data for everyone. Only use a backup file from this portal.
          </p>
          <label className={`inline-block bg-white/8 border border-white/15 text-white/70 font-body text-sm px-5 py-2.5 rounded-xl cursor-pointer hover:bg-white/12 transition-colors ${importing ? "opacity-50 pointer-events-none" : ""}`}>
            {importing ? "Importing…" : "Choose Backup File"}
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>

        {status && (
          <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/60 text-sm font-body">
            {status}
          </div>
        )}

        <div className="bg-blue-500/8 border border-blue-500/20 rounded-xl p-5">
          <h2 className="font-display font-bold text-blue-400 text-sm mb-2">Firebase Setup</h2>
          <p className="text-white/50 text-sm leading-relaxed">
            Data is stored in Firebase Realtime Database. If the orange warning banner appears at the top, Firebase is not yet configured.
            Add these environment variables in your Vercel project settings:
          </p>
          <pre className="mt-3 text-xs text-white/40 font-mono leading-relaxed whitespace-pre-wrap">
{`NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID`}
          </pre>
          <p className="text-white/40 text-xs mt-3">See the README in the repo for step-by-step Firebase setup instructions.</p>
        </div>
      </div>
    </MembersLayout>
  );
}
