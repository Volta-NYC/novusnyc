"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/members/supabaseAuth";
import { Btn, Input, PasswordInput } from "@/components/members/ui";
import { useAuth } from "@/lib/members/authContext";

export default function MembersLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const router = useRouter();
  const { user, authRole, loading: authLoading } = useAuth();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPasswordReset(new URLSearchParams(window.location.search).get("reset") === "1");
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    if (authRole === "member") { router.replace("/members/me"); return; }
    router.replace("/members/projects");
  }, [authLoading, user, authRole, router]);

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

  return (
    <div className="members-auth members-portal-light min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Novus NYC logo" width={223} height={200} className="h-16 w-auto object-contain mb-4" />
          <h1 className="font-display font-bold text-white text-2xl">Members Portal</h1>
          <p className="text-white/40 text-sm mt-1">Sign in with your Novus account</p>
        </div>

        {passwordReset && (
          <div className="bg-[#F6B78D]/10 border border-[#F6B78D]/25 rounded-xl px-4 py-3 text-[#F6B78D] text-sm mb-4">
            Password updated. Sign in with your new password.
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
          <div>
            <label htmlFor="member-login-email" className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <Input
              id="member-login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={(e) => e.target.select()}
              placeholder="you@email.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="member-login-password" className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <PasswordInput
              id="member-login-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Btn type="submit" variant="primary" disabled={loading} className="w-full py-3">
            {loading ? "Signing in…" : "Sign In"}
          </Btn>
        </form>

        <p className="text-center mt-4 text-sm font-body">
          <Link
            href="/members/forgot-password"
            className="text-white/50 hover:text-white/70 transition-colors"
          >
            Forgot password?
          </Link>
        </p>
        <p className="text-center mt-3">
          <Link href="/" className="text-white/40 text-sm hover:text-white/60 transition-colors">
            ← Back to home page
          </Link>
        </p>
      </div>
    </div>
  );
}
