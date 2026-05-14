"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Spinner } from "@/components/members/ui";

export default function SignupPage() {
  const [name, setName]         = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [ready, setReady]       = useState(false);   // true once invite session detected
  const [invalid, setInvalid]   = useState(false);   // true if no valid invite in URL
  const router = useRouter();

  // Supabase automatically exchanges the invite token in the URL hash for a session.
  // We wait for the SIGNED_IN event to confirm the invite was valid.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Pre-fill name from user metadata if the invite included it.
        const metaName = session.user.user_metadata?.full_name as string | undefined;
        if (metaName) setName(metaName);
        setReady(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const metaName = session.user.user_metadata?.full_name as string | undefined;
        if (metaName) setName(metaName);
        setReady(true);
      }
      if (event === "INITIAL_SESSION" && !session) {
        setInvalid(true);
      }
    });

    // If no auth event fires within 3 s, the URL had no invite token.
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) setInvalid(true);
      });
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
      // Set the member's password (they were already signed in by the invite link).
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
        data: { full_name: name.trim() },
      });
      if (updateErr) throw updateErr;

      // Get the fresh session token after the password update.
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("no_session");

      // Link auth_uid to the matching team row.
      await fetch("/api/members/signup/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim() }),
      });

      router.replace("/members");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "";
      if (msg.includes("weak") || msg.includes("Password should be")) {
        setError("Password is too weak. Use at least 8 characters.");
      } else if (msg.includes("expired") || msg.includes("invalid")) {
        setError("Your invite link has expired. Contact an admin for a new one.");
      } else {
        setError("Account setup failed. Please try again or contact an admin.");
      }
      setLoading(false);
    }
  };

  // Still waiting to detect invite session.
  if (!ready && !invalid) {
    return (
      <div className="min-h-screen bg-[#0F1014] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // No invite token found — show guidance.
  if (invalid) {
    return (
      <div className="min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <Image src="/logo.png" alt="Volta" width={48} height={48} className="object-contain mb-6 mx-auto" />
          <h1 className="font-display font-bold text-white text-2xl mb-3">Invalid Invite</h1>
          <p className="text-white/50 text-sm mb-6">
            This link is invalid or has expired. Use the personal invite link from your
            acceptance email, or contact an admin for a new one.
          </p>
          <Link
            href="/members/login"
            className="text-[#85CC17]/70 hover:text-[#85CC17] text-sm transition-colors"
          >
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Volta" width={48} height={48} className="object-contain mb-4" />
          <h1 className="font-display font-bold text-white text-2xl">Set Up Your Account</h1>
          <p className="text-white/40 text-sm mt-1">Welcome to the Volta member portal.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
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
              placeholder="Min. 8 characters"
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
            {loading ? "Setting up…" : "Complete Setup"}
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
