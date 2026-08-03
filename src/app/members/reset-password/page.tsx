"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { signOut } from "@/lib/members/supabaseAuth";
import { Spinner, Btn, PasswordInput } from "@/components/members/ui";

type Phase = "waiting" | "form" | "invalid";

export default function ResetPasswordPage() {
  const [phase, setPhase]       = useState<Phase>("waiting");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  useEffect(() => {
    let recoveryFired = false;

    // PASSWORD_RECOVERY fires after Supabase exchanges the token/code from the URL.
    // INITIAL_SESSION fires first (before exchange completes) — ignoring it avoids
    // a race where we'd show "Link Expired" before PASSWORD_RECOVERY can fire.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recoveryFired = true;
        setPhase("form");
      }
    });

    // Fallback: if PASSWORD_RECOVERY hasn't fired within 3 s the URL had no
    // valid recovery token, so sign out any stale session and show the error.
    const timer = setTimeout(() => {
      if (!recoveryFired) {
        void signOut().finally(() => setPhase("invalid"));
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8)  { setError("Password must be at least 8 characters."); return; }

    setLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      // Sign out so the user re-authenticates with their new password.
      // This prevents the recovery session from granting silent portal access.
      await signOut();
      router.replace("/members/login?reset=1");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "";
      if (msg.includes("weak") || msg.includes("Password should be")) {
        setError("Password is too weak. Use at least 8 characters with a mix of characters.");
      } else {
        setError("Failed to set password. Please try again or request a new reset link.");
      }
      setLoading(false);
    }
  };

  if (phase === "waiting") {
    return (
      <div className="min-h-screen bg-[#0F1014] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <Image src="/logo.png" alt="Novus NYC logo" width={38} height={68} className="h-16 w-auto object-contain mb-6 mx-auto" />
          <h1 className="font-display font-bold text-white text-2xl mb-3">Link Expired</h1>
          <p className="text-white/50 text-sm mb-6">
            This password reset link is invalid or has already been used.
            Request a new one from the sign-in page.
          </p>
          <a
            href="/members/login"
            className="text-[#F6B78D]/70 hover:text-[#F6B78D] text-sm transition-colors"
          >
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Novus NYC logo" width={38} height={68} className="h-16 w-auto object-contain mb-4" />
          <h1 className="font-display font-bold text-white text-2xl">Set New Password</h1>
          <p className="text-white/40 text-sm mt-1">Choose a strong password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              New Password
            </label>
            <PasswordInput
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <PasswordInput
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="........"
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Btn type="submit" variant="primary" disabled={loading} className="w-full py-3">
            {loading ? "Saving..." : "Set Password"}
          </Btn>
        </form>
      </div>
    </div>
  );
}
