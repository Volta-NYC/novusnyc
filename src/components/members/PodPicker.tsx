"use client";

import { useState } from "react";
import {
  addPodMember, removePodMember, setPodMemberRole,
  type Pod, type PodMember, type PodRole,
} from "@/lib/members/storage";

// Membership is editable from the person as well as from the pod, because
// "which pods is this person in" is the question you have when you're looking
// at a person. One click adds or removes; the LIT toggle appears once they're in.
export default function PodPicker({
  pods, memberships, memberId, disabled = false, compact = false,
}: {
  pods: Pod[];
  memberships: PodMember[];   // rows for this member (left_at already filtered)
  memberId: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roleOf = (podId: string): PodRole | null =>
    memberships.find((m) => m.podId === podId)?.role ?? null;

  const run = async (podId: string, fn: () => Promise<void>) => {
    setBusy(podId);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't save. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const toggle = (pod: Pod) => {
    const role = roleOf(pod.id);
    return run(pod.id, () => role
      ? removePodMember(pod.id, memberId)
      : addPodMember(pod.id, memberId, "member"));
  };

  const toggleLit = (pod: Pod) => {
    const role = roleOf(pod.id);
    return run(pod.id, () => setPodMemberRole(pod.id, memberId, role === "lit" ? "member" : "lit"));
  };

  const active = [...pods]
    .filter((p) => p.status !== "Archived")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="flex flex-col gap-1.5">
      <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "gap-2"}`}>
        {active.map((pod) => {
          const role = roleOf(pod.id);
          const on = !!role;
          const isBusy = busy === pod.id;
          return (
            <span
              key={pod.id}
              className={`inline-flex items-center overflow-hidden rounded-full border transition-colors ${
                on
                  ? "border-[#F3E28D]/45 bg-[#F3E28D]/15"
                  : "border-white/12 bg-white/[0.03]"
              } ${isBusy ? "opacity-50" : ""}`}
            >
              <button
                type="button"
                disabled={disabled || isBusy}
                onClick={() => void toggle(pod)}
                aria-pressed={on}
                title={on ? `Remove from ${pod.name}` : `Add to ${pod.name}`}
                className={`px-2.5 py-1 text-[11px] transition-colors disabled:cursor-not-allowed ${
                  on ? "text-[#F3E28D]" : "text-white/55 hover:text-white/85"
                }`}
              >
                {pod.name.replace(/^Novus /, "")}
              </button>

              {on && (
                <button
                  type="button"
                  disabled={disabled || isBusy}
                  onClick={() => void toggleLit(pod)}
                  aria-pressed={role === "lit"}
                  title={role === "lit" ? "Demote to member" : "Make LIT of this pod"}
                  className={`border-l px-1.5 py-1 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                    role === "lit"
                      ? "border-[#F3E28D]/35 bg-[#F3E28D]/25 text-[#F3E28D]"
                      : "border-white/12 text-white/30 hover:text-white/70"
                  }`}
                >
                  LIT
                </button>
              )}
            </span>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-[10px] text-red-400">{error}</p>
      )}
      {!disabled && !compact && (
        <p className="text-[10px] text-white/25">
          Click a pod to add or remove. Click LIT to give or take pod-leader access.
        </p>
      )}
    </div>
  );
}
