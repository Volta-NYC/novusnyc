"use client";

import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";

export default function MembersNotFound() {
  return (
    <MembersLayout>
      <div className="max-w-md mx-auto mt-20 text-center">
        <p className="font-display font-bold text-[#F6B78D] text-6xl mb-4">404</p>
        <h1 className="font-display font-bold text-black text-2xl mb-2">Page not found</h1>
        <p className="text-black/55 text-sm mb-8">
          This page doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/members/me"
            className="rounded-full bg-[#F6B78D] text-[#0D0D0D] font-display font-bold text-sm px-6 py-2.5 hover:bg-[#E9A77E] transition-colors"
          >
            Go to Overview
          </Link>
          <Link
            href="/members/work/catalog"
            className="rounded-full border border-black/15 text-black/70 font-display font-bold text-sm px-6 py-2.5 hover:border-black/35 transition-colors"
          >
            Browse Work
          </Link>
        </div>
      </div>
    </MembersLayout>
  );
}
