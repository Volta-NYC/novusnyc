"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getUserByEmail, verifyPassword, createSession } from "@/lib/members/auth";

export default function MembersLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = getUserByEmail(email);
      if (!user) { setError("No account found for that email."); return; }
      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) { setError("Incorrect password."); return; }
      createSession(user);
      router.replace("/members/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Volta" width={48} height={48} className="object-contain mb-4" />
          <h1 className="font-display font-bold text-white text-2xl">Members Portal</h1>
          <p className="text-white/40 text-sm mt-1">Sign in to your Volta account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
              placeholder="you@email.com" autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Password</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
              placeholder="••••••••" />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full bg-[#85CC17] text-[#0D0D0D] font-display font-bold py-3 rounded-xl hover:bg-[#72b314] transition-colors disabled:opacity-60 mt-1">
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-white/30 text-sm mt-5">
          New member?{" "}
          <Link href="/members/signup" className="text-[#85CC17] hover:underline">Create account</Link>
          {" "}with your access key
        </p>
        <p className="text-center mt-3">
          <Link href="/" className="text-white/20 text-xs hover:text-white/40 transition-colors">← Back to voltanyc.org</Link>
        </p>
      </div>
    </div>
  );
}
