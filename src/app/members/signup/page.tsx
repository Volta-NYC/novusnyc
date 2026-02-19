"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { validateAccessKey, consumeKey, createUser, createSession, type Role } from "@/lib/members/auth";

export default function MembersSignup() {
  const [step, setStep] = useState<"key" | "details">("key");
  const [key, setKey] = useState("");
  const [resolvedRole, setResolvedRole] = useState<Role>("member");
  const [resolvedKeyId, setResolvedKeyId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = validateAccessKey(key);
    if (!result.valid) { setError(result.error ?? "Invalid key."); return; }
    setResolvedRole(result.role!);
    setResolvedKeyId(result.keyId ?? null);
    setStep("details");
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const user = await createUser(name, email, password, resolvedRole);
      if (resolvedKeyId) consumeKey(resolvedKeyId);
      createSession(user);
      router.replace("/members/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  const ROLE_DESCRIPTIONS: Record<Role, string> = {
    admin: "Full access — manage keys, users, all data",
    project_lead: "Edit projects, tasks, and businesses",
    member: "View and update assigned projects and tasks",
    viewer: "Read-only access to all dashboards",
  };

  return (
    <div className="min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Volta" width={48} height={48} className="object-contain mb-4" />
          <h1 className="font-display font-bold text-white text-2xl">Create Account</h1>
          <p className="text-white/40 text-sm mt-1">You need an access key from Slack</p>
        </div>

        {step === "key" && (
          <form onSubmit={handleKeySubmit} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Access Key</label>
              <input required value={key} onChange={(e) => setKey(e.target.value)}
                className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 font-mono tracking-widest"
                placeholder="VOLTA-XXXX-XXXX" autoFocus />
              <p className="text-xs text-white/25 mt-1.5">Check the Volta Slack for this week&apos;s key.</p>
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">{error}</div>}
            <button type="submit"
              className="w-full bg-[#85CC17] text-[#0D0D0D] font-display font-bold py-3 rounded-xl hover:bg-[#72b314] transition-colors">
              Verify Key →
            </button>
          </form>
        )}

        {step === "details" && (
          <form onSubmit={handleSignup} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
            <div className="bg-[#85CC17]/10 border border-[#85CC17]/20 rounded-lg px-3 py-2.5 mb-1">
              <p className="text-[#85CC17] text-xs font-semibold uppercase tracking-wider">Key valid — Role assigned</p>
              <p className="text-white text-sm font-medium capitalize mt-0.5">{resolvedRole.replace("_", " ")}</p>
              <p className="text-white/40 text-xs mt-0.5">{ROLE_DESCRIPTIONS[resolvedRole]}</p>
            </div>
            {["Full Name", "Email", "Password", "Confirm Password"].map((label) => {
              const key2 = label === "Full Name" ? name : label === "Email" ? email : label === "Password" ? password : confirm;
              const setter = label === "Full Name" ? setName : label === "Email" ? setEmail : label === "Password" ? setPassword : setConfirm;
              return (
                <div key={label}>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">{label}</label>
                  <input required type={label.includes("Password") ? "password" : label === "Email" ? "email" : "text"}
                    value={key2} onChange={(e) => setter(e.target.value)}
                    className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
                    placeholder={label === "Email" ? "you@email.com" : label === "Full Name" ? "Your full name" : "••••••••"} />
                </div>
              );
            })}
            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">{error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#85CC17] text-[#0D0D0D] font-display font-bold py-3 rounded-xl hover:bg-[#72b314] transition-colors disabled:opacity-60">
              {loading ? "Creating account…" : "Create Account →"}
            </button>
          </form>
        )}

        <p className="text-center text-white/30 text-sm mt-5">
          Already have an account?{" "}
          <Link href="/members/login" className="text-[#85CC17] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
