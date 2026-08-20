"use client";

import { useLayoutEffect, useRef } from "react";

type HomeProjectMasonryProps = {
  children: React.ReactNode;
};

/**
 * Keeps the project cards in document order while arranging their variable
 * heights into the shortest available column. This gives the home section its
 * masonry shape without changing keyboard or screen-reader navigation order.
 */
export default function HomeProjectMasonry({ children }: HomeProjectMasonryProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let frame = 0;

    const layout = () => {
      frame = 0;
      const cards = Array.from(container.children) as HTMLElement[];
      if (cards.length === 0 || container.clientWidth === 0) return;

      const columns = window.matchMedia("(min-width: 1024px)").matches ? 3 : 2;
      const gap = Number.parseFloat(window.getComputedStyle(container).columnGap) || 20;
      const cardWidth = (container.clientWidth - gap * (columns - 1)) / columns;
      const columnHeights = Array.from({ length: columns }, () => 0);

      cards.forEach((card) => {
        card.style.width = `${cardWidth}px`;
      });

      cards.forEach((card) => {
        const column = columnHeights.reduce(
          (shortest, height, index) => height < columnHeights[shortest] ? index : shortest,
          0,
        );
        const x = column * (cardWidth + gap);
        const y = columnHeights[column];

        // The reveal animation owns `transform`, so masonry positioning must
        // use physical coordinates or every animated card collapses to x = 0.
        card.style.removeProperty("transform");
        card.style.left = `${x}px`;
        card.style.top = `${y}px`;
        columnHeights[column] += card.offsetHeight + gap;
      });

      container.style.height = `${Math.max(...columnHeights) - gap}px`;
      container.dataset.masonryReady = "true";
    };

    const scheduleLayout = () => {
      if (!frame) frame = window.requestAnimationFrame(layout);
    };

    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(container);
    Array.from(container.children).forEach((card) => observer.observe(card));
    window.addEventListener("resize", scheduleLayout);
    scheduleLayout();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleLayout);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="home-project-masonry relative hidden sm:grid grid-cols-2 gap-5 lg:grid-cols-3"
    >
      {children}
    </div>
  );
}
