"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/members/firebaseAuth";
import { ref, set } from "firebase/database";
import { getDB } from "@/lib/firebase";

export default function SignupPage() {
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      // TEMPORARY: invite code check bypassed for initial admin setup
      // Create Firebase Auth account
      const cred = await signUp(email.trim().toLowerCase(), password);

      // Create userProfile in Realtime Database as admin
      const db = getDB();
      if (db) {
        await set(ref(db, `userProfiles/${cred.user.uid}`), {
          email: email.trim().toLowerCase(),
          authRole: "admin",
          name: name.trim(),
          active: true,
          createdAt: new Date().toISOString(),
        });
      }

      router.replace("/members/dashboard");
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Sign in instead.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else {
        setError("Sign up failed. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Volta" width={48} height={48} className="object-contain mb-4" />
          <h1 className="font-display font-bold text-white text-2xl">Create Account</h1>
          <p className="text-white/40 text-sm mt-1">You need an invite code to join.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Invite Code
            </label>
            <input
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors font-mono uppercase tracking-widest"
              placeholder="VOLTA-XXXXXX"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
              placeholder="you@email.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
              placeholder="Min. 6 characters"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#85CC17] text-[#0D0D0D] font-display font-bold py-3 rounded-xl hover:bg-[#72b314] transition-colors disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center mt-4 text-sm font-body">
          <Link href="/members/login" className="text-white/40 hover:text-white/70 transition-colors">
            Already have an account? Sign in →
          </Link>
        </p>
      </div>
    </div>
  );
}
