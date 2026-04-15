"use client";

import { useRef, useState, useEffect, useCallback } from "react";

interface Position {
  x: number;
  y: number;
}

interface Props {
  children: React.ReactNode[];
  itemIds: string[];
  itemWidth?: number;
  gap?: number;
}

export default function MasonryGrid({
  children,
  itemIds,
  itemWidth = 290,
  gap = 24,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [positions, setPositions] = useState<Record<string, Position>>({});
  const [containerHeight, setContainerHeight] = useState(0);
  const [colWidth, setColWidth] = useState(itemWidth);
  const [isReady, setIsReady] = useState(false);

  const calculateLayout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const availableWidth = container.offsetWidth;
    if (availableWidth === 0) return; // hidden via display:none (mobile breakpoint)

    // Use itemWidth as the minimum column width to decide how many columns fit,
    // then stretch all columns to fill the full container width.
    const columnCount = Math.max(1, Math.floor((availableWidth + gap) / (itemWidth + gap)));
    const actualColWidth = (availableWidth - (columnCount - 1) * gap) / columnCount;

    const columnHeights = new Array(columnCount).fill(0);
    const newPositions: Record<string, Position> = {};

    itemIds.forEach((id) => {
      const el = cardRefs.current[id];
      if (!el) return;

      const height = el.offsetHeight;
      const shortestCol = columnHeights.indexOf(Math.min(...columnHeights));

      newPositions[id] = {
        x: shortestCol * (actualColWidth + gap),
        y: columnHeights[shortestCol],
      };
      columnHeights[shortestCol] += height + gap;
    });

    const maxHeight = Math.max(0, Math.max(...columnHeights) - gap);
    setPositions(newPositions);
    setContainerHeight(maxHeight);
    setColWidth(actualColWidth);
    setIsReady(true);
  }, [itemIds, itemWidth, gap]);

  // Initial layout + container width changes (guarded to avoid loop when container height is set)
  useEffect(() => {
    const timer = setTimeout(calculateLayout, 100);

    let lastWidth = 0;
    const containerObserver = new ResizeObserver(() => {
      const w = containerRef.current?.offsetWidth ?? 0;
      if (w !== lastWidth) {
        lastWidth = w;
        calculateLayout();
      }
    });
    if (containerRef.current) containerObserver.observe(containerRef.current);

    return () => {
      clearTimeout(timer);
      containerObserver.disconnect();
    };
  }, [calculateLayout]);

  // Card height changes — e.g. ExpandableDescription expanding/collapsing
  useEffect(() => {
    if (!isReady) return;
    const cardObserver = new ResizeObserver(calculateLayout);
    itemIds.forEach((id) => {
      const el = cardRefs.current[id];
      if (el) cardObserver.observe(el);
    });
    return () => cardObserver.disconnect();
  }, [itemIds, calculateLayout, isReady]);

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: containerHeight > 0 ? `${containerHeight}px` : undefined }}
    >
      {children.map((child, i) => {
        const id = itemIds[i];
        const pos = positions[id];
        return (
          <div
            key={id}
            ref={(el) => { cardRefs.current[id] = el; }}
            className="absolute"
            style={{
              left: pos ? `${pos.x}px` : 0,
              top: pos ? `${pos.y}px` : 0,
              width: `${colWidth}px`,
              opacity: isReady ? 1 : 0,
              transition: isReady
                ? `opacity 0.4s ease ${Math.min(i, 8) * 0.06}s`
                : "none",
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}
