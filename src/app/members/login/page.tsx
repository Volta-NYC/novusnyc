"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, resetPassword } from "@/lib/members/supabaseAuth";
import { Btn, Input } from "@/components/members/ui";
import { useAuth } from "@/lib/members/authContext";

export default function MembersLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/members");
    }
  }, [authLoading, user, router]);

  if (authLoading || user) return null;

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
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Btn type="submit" variant="primary" disabled={loading} className="w-full py-3">
              {loading ? "Signing in…" : "Sign In"}
            </Btn>
          </form>
        ) : resetSent ? (
          <div className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 text-center">
            <p className="text-[#85CC17] font-semibold mb-2">Check your email</p>
            <p className="text-white/50 text-sm">
              We sent a password reset link to <span className="text-white/80">{email}</span>.
            </p>
            <Btn
              type="button"
              variant="ghost"
              onClick={() => { setShowReset(false); setResetSent(false); }}
              className="mt-4 text-sm"
            >
              ← Back to sign in
            </Btn>
          </div>
        ) : (
          <form onSubmit={handleReset} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
            <p className="text-white/60 text-sm">Enter your email and we&apos;ll send a reset link.</p>
            <div>
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            <Btn type="submit" variant="primary" disabled={loading} className="w-full py-3">
              {loading ? "Sending…" : "Send Reset Link"}
            </Btn>
            <Btn
              type="button"
              variant="ghost"
              onClick={() => setShowReset(false)}
              className="w-full text-sm"
            >
              ← Back to sign in
            </Btn>
          </form>
        )}

        {!showReset && !resetSent && (
          <p className="text-center mt-4 text-sm font-body">
            <button
              onClick={() => setShowReset(true)}
              className="text-white/50 hover:text-white/70 transition-colors"
            >
              Forgot password?
            </button>
          </p>
        )}
        <p className="text-center mt-3">
          <Link href="/" className="text-white/40 text-sm hover:text-white/60 transition-colors">
            ← Back to home page
          </Link>
        </p>
      </div>
    </div>
  );
}
