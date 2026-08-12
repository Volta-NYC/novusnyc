"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Spinner, Btn, PasswordInput } from "@/components/members/ui";

type Phase =
  | "waiting"   // detecting session / hash
  | "landing"   // ?email= in URL, no session — show "Send me a setup link" button
  | "expired"   // otp_expired in URL hash — link expired, same CTA with different heading
  | "form"      // valid session established — show password form
  | "invalid";  // no token, unknown error

export default function SignupPage() {
  const [phase, setPhase]               = useState<Phase>("waiting");
  const [urlEmail, setUrlEmail]         = useState("");   // from ?email= query param
  const [sessionEmail, setSessionEmail] = useState("");   // from auth session
  const [name, setName]                 = useState("");
  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [formError, setFormError]       = useState("");
  const [formLoading, setFormLoading]   = useState(false);

  // Resend / send-link state
  const [sendLoading, setSendLoading] = useState(false);
  const [sendDone, setSendDone]       = useState(false);
  const [sendMsg, setSendMsg]         = useState("");
  const [manualEmail, setManualEmail] = useState("");  // only used when ?email= is absent

  const router = useRouter();

  useEffect(() => {
    const qEmail = typeof window !== "undefined"
      ? (new URLSearchParams(window.location.search).get("email") ?? "").trim().toLowerCase()
      : "";
    if (qEmail) setUrlEmail(qEmail);

    // Detect Supabase error in URL hash (expired / invalid OTP token).
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.hash.slice(1));
      const errorCode = params.get("error_code");
      if (errorCode) {
        setPhase(errorCode === "otp_expired" || errorCode === "otp_disabled" ? "expired" : "invalid");
        return;
      }
    }

    // Listen for auth session from an OTP link click.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        const metaName = session.user.user_metadata?.full_name as string | undefined;
        if (metaName) setName(metaName);
        if (session.user.email) setSessionEmail(session.user.email);
        setPhase("form");
      }
      if (event === "INITIAL_SESSION" && !session) {
        // No OTP session — show landing if we have an email, otherwise invalid.
        setPhase(qEmail ? "landing" : "invalid");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        const metaName = session.user.user_metadata?.full_name as string | undefined;
        if (metaName) setName(metaName);
        if (session.user.email) setSessionEmail(session.user.email);
        setPhase("form");
      }
    });

    // Fallback: if no auth event fires within 4 s, resolve phase.
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) setPhase(qEmail ? "landing" : "invalid");
      });
    }, 4000);

    return () => { subscription.unsubscribe(); clearTimeout(timer); };
  }, []);

  // ── Send setup link ────────────────────────────────────────────────────────

  const sendSetupLink = async (emailToSend: string) => {
    setSendLoading(true);
    setSendMsg("");
    try {
      const res = await fetch("/api/members/signup/resend-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToSend.trim().toLowerCase() }),
      });
      const data = await res.json() as { success?: boolean; alreadyLinked?: boolean; error?: string };

      if (res.status === 429) {
        setSendMsg("Too many requests. Please wait a few minutes and try again.");
      } else if (!res.ok || !data.success) {
        setSendMsg("Something went wrong. Please try again.");
      } else if (data.alreadyLinked) {
        setSendMsg("Your account is already set up. Use the sign-in page, or Forgot Password if you never set a password.");
      } else {
        setSendDone(true);
      }
    } catch {
      setSendMsg("Something went wrong. Please try again.");
    } finally {
      setSendLoading(false);
    }
  };

  // ── Password setup submit ──────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (password !== confirm) { setFormError("Passwords do not match."); return; }
    if (password.length < 8)  { setFormError("Password must be at least 8 characters."); return; }

    setFormLoading(true);
    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
        data: { full_name: name.trim() },
      });
      if (updateErr) throw updateErr;

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("no_session");

      const completeRes = await fetch("/api/members/signup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!completeRes.ok) {
        const { error: completeErr } = await completeRes.json().catch(() => ({ error: "unknown" })) as { error?: string };
        if (completeErr === "team_member_not_found") {
          throw new Error("Your account is not in the member directory. Contact an admin.");
        }
      }

      router.replace("/members");
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? "";
      if (msg.includes("weak") || msg.includes("Password should be")) {
        setFormError("Password is too weak. Use at least 8 characters.");
      } else if (msg.includes("member directory")) {
        setFormError(msg);
      } else {
        setFormError("Account setup failed. Please try again or contact an admin.");
      }
      setFormLoading(false);
    }
  };

  // ── Shared "send me a link" card (used by both landing and expired phases) ─

  const confirmedEmail = urlEmail || manualEmail;

  function SendLinkCard({ heading, subheading }: { heading: string; subheading: string }) {
    if (sendDone) {
      return (
        <div className="bg-[#F6B78D]/10 border border-[#F6B78D]/25 rounded-xl p-5 text-center">
          <h1 className="sr-only">Set up your account</h1>
          <p className="text-[#F6B78D] font-semibold font-display mb-1">Check your email</p>
          <p className="text-white/50 text-sm font-body">
            A setup link has been sent to{" "}
            <span className="text-white/80">{confirmedEmail}</span>.
            Click it to continue — the link expires in 24 hours.
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Novus NYC logo" width={223} height={200} className="h-16 w-auto object-contain mb-4" />
          <h1 className="font-display font-bold text-white text-2xl">{heading}</h1>
          <p className="text-white/40 text-sm mt-1 text-center">{subheading}</p>
        </div>

        <div className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
          {urlEmail ? (
            // Email is known from the URL — single button, no typing required.
            <>
              <p className="text-white/50 text-sm font-body text-center">
                We&apos;ll send a setup link to{" "}
                <span className="text-white/80 font-medium">{urlEmail}</span>.
              </p>
              {sendMsg && (
                <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white/60 text-sm">
                  {sendMsg}
                </div>
              )}
              <Btn
                variant="primary"
                disabled={sendLoading}
                onClick={() => void sendSetupLink(urlEmail)}
                className="w-full py-3"
              >
                {sendLoading ? "Sending..." : "Send me a setup link"}
              </Btn>
            </>
          ) : (
            // Fallback: no email in URL (e.g. someone navigates here directly).
            <form onSubmit={(e) => { e.preventDefault(); void sendSetupLink(manualEmail); }}>
              <div className="mb-4">
                <label htmlFor="signup-link-email" className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                  Your Email
                </label>
                <input
                  id="signup-link-email"
                  type="email"
                  required
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  className="w-full bg-[#0F1014] border border-white/35 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#F6B78D] transition-colors"
                  placeholder="you@email.com"
                  autoFocus
                  autoComplete="email"
                />
              </div>
              {sendMsg && (
                <div className="mb-4 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white/60 text-sm">
                  {sendMsg}
                </div>
              )}
              <Btn type="submit" variant="primary" disabled={sendLoading} className="w-full py-3">
                {sendLoading ? "Sending..." : "Send me a setup link"}
              </Btn>
            </form>
          )}
        </div>

        <p className="text-center mt-4 text-sm font-body">
          <Link href="/members/login" className="text-white/40 hover:text-white/70 transition-colors">
            Already have an account? Sign in
          </Link>
        </p>
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (phase === "waiting") {
    return (
      <div className="members-auth min-h-screen bg-[#0F1014] flex items-center justify-center">
        <h1 className="sr-only">Set up your account</h1>
        <Spinner />
      </div>
    );
  }

  if (phase === "landing" || phase === "expired") {
    return (
      <div className="members-auth min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <SendLinkCard
            heading={phase === "expired" ? "Link Expired" : "Set Up Your Account"}
            subheading={
              phase === "expired"
                ? "Your setup link has expired. Click below to get a new one."
                : "Click below to receive your secure setup link."
            }
          />
        </div>
      </div>
    );
  }

  if (phase === "invalid") {
    return (
      <div className="members-auth min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <Image src="/logo.png" alt="Novus NYC logo" width={223} height={200} className="h-16 w-auto object-contain mb-6 mx-auto" />
          <h1 className="font-display font-bold text-white text-2xl mb-3">Invalid Link</h1>
          <p className="text-white/50 text-sm mb-6">
            This link is invalid. Use the invite link from your email, or contact an admin.
          </p>
          <Link href="/members/login" className="text-[#F6B78D]/70 hover:text-[#F6B78D] text-sm transition-colors">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    );
  }

  // phase === "form" — valid OTP session, set password
  return (
    <div className="members-auth min-h-screen bg-[#0F1014] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Image src="/logo.png" alt="Novus NYC logo" width={223} height={200} className="h-16 w-auto object-contain mb-4" />
          <h1 className="font-display font-bold text-white text-2xl">Set Up Your Account</h1>
          <p className="text-white/40 text-sm mt-1">Choose a password to complete your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#1C1F26] border border-white/8 rounded-2xl p-6 space-y-4">
          <div>
            <label htmlFor="signup-full-name" className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              id="signup-full-name"
              value={name}
              readOnly
              className="w-full bg-[#0F1014] border border-white/35 rounded-lg px-3 py-2.5 text-sm text-white/60 cursor-default select-none focus:outline-none"
            />
          </div>

          {sessionEmail && (
            <div>
              <label htmlFor="signup-email" className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Email
              </label>
              <input
                id="signup-email"
                value={sessionEmail}
                readOnly
                className="w-full bg-[#0F1014] border border-white/35 rounded-lg px-3 py-2.5 text-sm text-white/60 cursor-default select-none focus:outline-none"
              />
            </div>
          )}

          <div>
            <label htmlFor="signup-password" className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <PasswordInput
              id="signup-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="signup-password-confirm" className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <PasswordInput
              id="signup-password-confirm"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="........"
              autoComplete="new-password"
            />
          </div>

          {formError && (
            <div role="alert" className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm">
              {formError}
            </div>
          )}

          <Btn type="submit" variant="primary" disabled={formLoading} className="w-full py-3">
            {formLoading ? "Setting up..." : "Complete Setup"}
          </Btn>
        </form>
      </div>
    </div>
  );
}
