"use client";

import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  getHandbookPage, subscribeInfractions,
  type HandbookPage, type Infraction,
} from "@/lib/members/storage";
import { Spinner } from "@/components/members/ui";

const POINTS_PILL = "border-white/20 bg-black/5 text-black/60";

function HandbookContent() {
  const [page, setPage] = useState<HandbookPage | null>(null);
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHandbookPage("credit-infraction-policy")
      .then(setPage)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => subscribeInfractions(setInfractions), []);

  const sortedInfractions = [...infractions].sort((a, b) => (a.points - b.points) || a.name.localeCompare(b.name));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="font-display font-bold text-black/85 text-2xl">Member Handbook</h1>
        <p className="text-black/45 text-sm mt-1">Policies and guidelines for Volta NYC members.</p>
      </div>

      <div className="bg-white border border-black/8 rounded-xl shadow-sm p-6 md:p-10">
        {page ? (
          <>
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-black/8">
              <h2 className="font-display font-bold text-black/85 text-lg">{page.title}</h2>
              {page.updatedAt && (
                <span className="text-[11px] text-black/35 font-body">
                  Last updated: {new Date(page.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </span>
              )}
            </div>
            {page.content ? (
              <div
                className="prose prose-sm prose-headings:font-display prose-headings:text-black/85 prose-p:text-black/70 prose-li:text-black/70 max-w-none font-body leading-relaxed"
                dangerouslySetInnerHTML={{ __html: page.content }}
              />
            ) : (
              <p className="text-black/40 text-sm font-body">The handbook is being prepared. Check back soon.</p>
            )}
          </>
        ) : (
          <div className="py-8 text-center">
            <p className="text-black/40 text-sm font-body">The handbook is being prepared. Check back soon.</p>
          </div>
        )}

        {sortedInfractions.length > 0 && (
          <div className="mt-8 pt-8 border-t border-black/8">
            <h3 className="font-display font-bold text-black/85 text-base mb-1">Infraction Reference</h3>
            <p className="text-black/45 text-sm font-body mb-4">Demerit values assigned for each type of infraction. Current strike thresholds are shown on your Overview page.</p>
            <div className="rounded-xl border border-black/8 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-black/[0.03] border-b border-black/8">
                  <tr>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-black/45 w-[35%]">Infraction</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-black/45">Description</th>
                    <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-black/45 w-[100px]">Demerits</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedInfractions.map((inf) => (
                    <tr key={inf.id} className="border-b border-black/6 last:border-b-0 align-top">
                      <td className="px-4 py-2.5 font-body font-medium text-black/80 text-sm">{inf.name}</td>
                      <td className="px-4 py-2.5 font-body text-black/55 text-sm">{inf.description || <span className="text-black/30">—</span>}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${POINTS_PILL}`}>
                          {inf.points} {inf.points === 1 ? "demerit" : "demerits"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HandbookPage() {
  return (
    <MembersLayout>
      <HandbookContent />
    </MembersLayout>
  );
}
