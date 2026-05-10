"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, resetPassword } from "@/lib/members/supabaseAuth";

export default function MembersLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace("/members");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "";
      if (msg.includes("Invalid login credentials") || msg.includes("invalid_credentials")) {
        setError("Incorrect email or password.");
      } else if (msg.includes("too many requests") || msg.includes("over_email_send_rate_limit")) {
        setError("Too many attempts. Please wait a few minutes.");
      } else {
        setError("Sign in failed. Check your connection and try again.");
      }
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setResetSent(true);
    } catch {
      setError("Could not send reset email. Check your address and try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Volta" width={48} height={48} className="object-contain mb-4" />
          <h1 className="font-display font-bold text-white text-2xl">Members Portal</h1>
          <p className="text-white/40 text-sm mt-1">Sign in with your Volta account</p>
        </div>

        {!showReset ? (
          <form onSubmit={handleSubmit} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
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
                autoFocus
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
                placeholder="••••••••"
                autoComplete="current-password"
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
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        ) : resetSent ? (
          <div className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 text-center">
            <p className="text-[#85CC17] font-semibold mb-2">Check your email</p>
            <p className="text-white/50 text-sm">
              We sent a password reset link to <span className="text-white/80">{email}</span>.
            </p>
            <button
              onClick={() => { setShowReset(false); setResetSent(false); }}
              className="mt-4 text-white/40 text-sm hover:text-white/70 transition-colors"
            >
              ← Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
            <p className="text-white/60 text-sm">Enter your email and we&apos;ll send a reset link.</p>
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
                autoFocus
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
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
            <button
              type="button"
              onClick={() => setShowReset(false)}
              className="w-full text-white/30 text-sm hover:text-white/60 transition-colors py-1"
            >
              ← Back to sign in
            </button>
          </form>
        )}

        {!showReset && !resetSent && (
          <p className="text-center mt-4 text-sm font-body">
            <button
              onClick={() => setShowReset(true)}
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              Forgot password?
            </button>
          </p>
        )}
        <p className="text-center mt-3">
          <Link href="/" className="text-white/25 text-sm hover:text-white/50 transition-colors">
            ← Back to voltanyc.org
          </Link>
        </p>
      </div>
    </div>
  );
}
