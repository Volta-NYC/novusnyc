"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { subscribeChapters, type Chapter } from "@/lib/members/storage";

/**
 * Which chapter's portal you are in, taken from the URL.
 *
 * New York keeps the original paths (/members/projects). Every other chapter
 * gets its own namespace (/members/chicago/projects) holding the same screens
 * over that chapter's rows. One list per chapter beats one list with a filter:
 * a Chicago pod and a New York pod are never worked on in the same sitting.
 */
export interface ChapterScope {
  chapters: Chapter[];
  /** URL segment for the current chapter, or null for the home chapter. */
  slug: string | null;
  /** The chapter these pages read and write. Null until chapters load. */
  chapterId: string | null;
  name: string;
  /** "/members" or "/members/chicago" — the root every nav link hangs off. */
  basePath: string;
  scopedHref: (href: string) => string;
}

const ChapterScopeContext = createContext<ChapterScope | null>(null);

const HOME_PREFIX = "/members";

function slugFromPath(pathname: string, chapters: Chapter[]): string | null {
  const segment = pathname.replace(/^\/members\/?/, "").split("/")[0] ?? "";
  if (!segment) return null;
  const match = chapters.find((c) => c.slug === segment);
  // The home chapter owns the bare paths, so its slug is never in the URL.
  return match && !isHomeChapter(match, chapters) ? match.slug : null;
}

function isHomeChapter(chapter: Chapter, chapters: Chapter[]): boolean {
  return sortChapters(chapters)[0]?.id === chapter.id;
}

function sortChapters(chapters: Chapter[]): Chapter[] {
  return [...chapters].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function ChapterScopeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? HOME_PREFIX;
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => subscribeChapters(setChapters), []);

  const value = useMemo<ChapterScope>(() => {
    const ordered = sortChapters(chapters);
    const slug = slugFromPath(pathname, ordered);
    const current = slug ? ordered.find((c) => c.slug === slug) ?? null : ordered[0] ?? null;
    const basePath = slug ? `${HOME_PREFIX}/${slug}` : HOME_PREFIX;
    return {
      chapters: ordered,
      slug,
      chapterId: current?.id ?? null,
      name: current?.name ?? "New York",
      basePath,
      scopedHref: (href: string) =>
        href.startsWith(HOME_PREFIX) && basePath !== HOME_PREFIX
          ? `${basePath}${href.slice(HOME_PREFIX.length)}`
          : href,
    };
  }, [chapters, pathname]);

  return <ChapterScopeContext.Provider value={value}>{children}</ChapterScopeContext.Provider>;
}

export function useChapterScope(): ChapterScope {
  const value = useContext(ChapterScopeContext);
  if (!value) throw new Error("useChapterScope must be used inside ChapterScopeProvider");
  return value;
}

/** Strip a chapter namespace, so route matching can compare home paths. */
export function homePath(pathname: string, chapters: Chapter[]): string {
  const ordered = sortChapters(chapters);
  const segment = pathname.replace(/^\/members\/?/, "").split("/")[0] ?? "";
  const match = ordered.find((c) => c.slug === segment);
  if (!match || isHomeChapter(match, ordered)) return pathname;
  return `${HOME_PREFIX}${pathname.slice(`${HOME_PREFIX}/${segment}`.length)}` || HOME_PREFIX;
}

/**
 * Does a row belong to the chapter in view?
 *
 * Rows written before chapters existed carry no chapter, and they are all New
 * York, so an empty value counts as the home chapter rather than as nothing.
 */
export function inChapter(
  rowChapterId: string | null | undefined,
  scopeChapterId: string | null,
  homeChapterId: string | null,
): boolean {
  if (!scopeChapterId) return false;
  return (rowChapterId ?? homeChapterId) === scopeChapterId;
}
