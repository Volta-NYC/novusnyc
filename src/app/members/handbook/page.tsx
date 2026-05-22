"use client";

import { useEffect, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { getHandbookPage, type HandbookPage } from "@/lib/members/storage";
import { Spinner } from "@/components/members/ui";

function HandbookContent() {
  const [page, setPage] = useState<HandbookPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHandbookPage("credit-infraction-policy")
      .then(setPage)
      .finally(() => setLoading(false));
  }, []);

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
