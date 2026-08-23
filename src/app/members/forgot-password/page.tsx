"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/lib/members/supabaseAuth";
import { Btn, Input } from "@/components/members/ui";
import { useAuth } from "@/lib/members/authContext";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  if (user) {
    router.replace("/members");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await resetPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      setError("Could not send reset email. Check your address and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="members-auth members-portal-light min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Novus NYC logo" width={223} height={200} className="h-16 w-auto object-contain mb-4" />
          <h1 className="font-display font-bold text-white text-2xl">Reset Password</h1>
          <p className="text-white/40 text-sm mt-1">We&apos;ll email you a reset link</p>
        </div>

        {sent ? (
          <div className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 text-center">
            <p className="text-[#F6B78D] font-semibold mb-2">Check your email</p>
            <p className="text-white/50 text-sm">
              We sent a password reset link to <span className="text-white/80">{email}</span>.
            </p>
            <Link
              href="/members/login"
              className="mt-5 inline-block text-sm text-white/50 hover:text-white/70 transition-colors"
            >
              ← Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
            <p className="text-white/60 text-sm">Enter your email and we&apos;ll send a reset link.</p>
            <div>
              <label htmlFor="forgot-password-email" className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <Input
                id="forgot-password-email"
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
              <div role="alert" className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
                {error}
              </div>
            )}
            <Btn type="submit" variant="primary" disabled={loading} className="w-full py-3">
              {loading ? "Sending…" : "Send Reset Link"}
            </Btn>
            <Link
              href="/members/login"
              className="block text-center text-sm text-white/50 hover:text-white/70 transition-colors"
            >
              ← Back to sign in
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
