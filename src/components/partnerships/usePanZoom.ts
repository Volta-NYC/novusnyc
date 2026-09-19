"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

interface View { k: number; x: number; y: number }

interface Options {
  svgRef: RefObject<SVGSVGElement | null>;
  sceneRef: RefObject<SVGGElement | null>;
  width: number;
  height: number;
  maxScale: number;
  initialScale: (viewport: { w: number; h: number; fit: number }) => number;
  focus: { x: number; y: number };
  reduced: boolean;
}

const DRAG_THRESHOLD = 6;
const EDGE_SLACK = 48;

// Transforms are written straight to the scene's attribute rather than through
// React state, so dragging never re-renders the map.
export function usePanZoom({ svgRef, sceneRef, width, height, maxScale, initialScale, focus, reduced }: Options) {
  const view = useRef<View>({ k: 1, x: 0, y: 0 });
  const viewport = useRef({ w: 0, h: 0, fit: 1 });
  const touched = useRef(false);
  const suppressClick = useRef(false);
  const tween = useRef(0);
  const [interacted, setInteracted] = useState(false);
  const [zoomedIn, setZoomedIn] = useState(false);

  const clampView = useCallback(
    (next: View): View => {
      const { w, h, fit } = viewport.current;
      const k = Math.min(Math.max(next.k, fit), maxScale);
      const contentW = width * k;
      const contentH = height * k;
      const x = contentW + EDGE_SLACK * 2 <= w ? (w - contentW) / 2 : Math.min(EDGE_SLACK, Math.max(w - contentW - EDGE_SLACK, next.x));
      const y = contentH + EDGE_SLACK * 2 <= h ? (h - contentH) / 2 : Math.min(EDGE_SLACK, Math.max(h - contentH - EDGE_SLACK, next.y));
      return { k, x, y };
    },
    [width, height, maxScale],
  );

  const apply = useCallback(
    (next: View) => {
      view.current = clampView(next);
      const { k, x, y } = view.current;
      sceneRef.current?.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${k.toFixed(4)})`);
      setZoomedIn(k > viewport.current.fit * 1.02);
    },
    [clampView, sceneRef],
  );

  const markInteracted = useCallback(() => {
    touched.current = true;
    setInteracted(true);
  }, []);

  const animateTo = useCallback(
    (target: View) => {
      cancelAnimationFrame(tween.current);
      if (reduced) {
        apply(target);
        return;
      }
      const from = { ...view.current };
      const goal = clampView(target);
      const started = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - started) / 320, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        apply({ k: from.k + (goal.k - from.k) * ease, x: from.x + (goal.x - from.x) * ease, y: from.y + (goal.y - from.y) * ease });
        if (t < 1) tween.current = requestAnimationFrame(step);
      };
      tween.current = requestAnimationFrame(step);
    },
    [apply, clampView, reduced],
  );

  const viewCentredOn = useCallback((point: { x: number; y: number }, k: number): View => {
    const { w, h } = viewport.current;
    return { k, x: w / 2 - point.x * k, y: h / 2 - point.y * k };
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const { w, h } = viewport.current;
      const { k, x, y } = view.current;
      const next = Math.min(Math.max(k * factor, viewport.current.fit), maxScale);
      const cx = (w / 2 - x) / k;
      const cy = (h / 2 - y) / k;
      markInteracted();
      animateTo({ k: next, x: w / 2 - cx * next, y: h / 2 - cy * next });
    },
    [animateTo, markInteracted, maxScale],
  );

  const showAll = useCallback(() => {
    markInteracted();
    animateTo(viewCentredOn(focus, viewport.current.fit));
  }, [animateTo, focus, markInteracted, viewCentredOn]);

  const centreOn = useCallback(
    (point: { x: number; y: number }, onlyIfHidden = false) => {
      const { w, h } = viewport.current;
      const { k, x, y } = view.current;
      if (onlyIfHidden) {
        const sx = point.x * k + x;
        const sy = point.y * k + y;
        const margin = 60;
        if (sx > margin && sx < w - margin && sy > margin && sy < h - margin) return;
      }
      animateTo(viewCentredOn(point, k));
    },
    [animateTo, viewCentredOn],
  );

  // Frames a region (an organization plus its business names) at a readable
  // zoom, pulling back only as far as needed for the whole region to fit.
  const reveal = useCallback(
    (box: { x0: number; y0: number; x1: number; y1: number }) => {
      const { w, h, fit } = viewport.current;
      const readable = Math.max(fit, initialScale({ w, h, fit }));
      const fitsBox = Math.min(w / (box.x1 - box.x0 + 48), h / (box.y1 - box.y0 + 48));
      const k = Math.min(Math.max(view.current.k, readable), fitsBox, maxScale);
      animateTo(viewCentredOn({ x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 }, Math.max(k, fit)));
    },
    [animateTo, initialScale, maxScale, viewCentredOn],
  );

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const measure = () => {
      const rect = svg.getBoundingClientRect();
      const fit = Math.min(rect.width / width, rect.height / height);
      viewport.current = { w: rect.width, h: rect.height, fit };
      if (!touched.current) {
        apply(viewCentredOn(focus, Math.max(fit, initialScale({ w: rect.width, h: rect.height, fit }))));
      } else {
        apply(view.current);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [apply, focus, height, initialScale, svgRef, viewCentredOn, width]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { x: number; y: number; view: View; active: boolean } | null = null;
    let pinch: { distance: number; mid: { x: number; y: number }; view: View } | null = null;

    const local = (event: PointerEvent | WheelEvent) => {
      const rect = svg.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };
    const pinchState = () => {
      const [a, b] = [...pointers.values()];
      return { distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    };

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointers.set(event.pointerId, local(event));
      cancelAnimationFrame(tween.current);
      if (pointers.size === 1) {
        // A pinch never produces a click, so a flag left by one must not eat
        // the next tap.
        suppressClick.current = false;
        drag = { ...local(event), view: { ...view.current }, active: false };
        pinch = null;
      } else if (pointers.size === 2) {
        pinch = { ...pinchState(), view: { ...view.current } };
        drag = null;
        for (const id of pointers.keys()) svg.setPointerCapture?.(id);
      }
    };

    const onMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, local(event));
      if (pinch && pointers.size >= 2) {
        const { distance, mid } = pinchState();
        const k = Math.min(Math.max(pinch.view.k * (distance / pinch.distance), viewport.current.fit), maxScale);
        const cx = (pinch.mid.x - pinch.view.x) / pinch.view.k;
        const cy = (pinch.mid.y - pinch.view.y) / pinch.view.k;
        apply({ k, x: mid.x - cx * k, y: mid.y - cy * k });
        suppressClick.current = true;
        markInteracted();
        return;
      }
      if (!drag) return;
      const point = local(event);
      const dx = point.x - drag.x;
      const dy = point.y - drag.y;
      if (!drag.active && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        drag.active = true;
        svg.setPointerCapture?.(event.pointerId);
        markInteracted();
      }
      if (drag.active) {
        apply({ k: drag.view.k, x: drag.view.x + dx, y: drag.view.y + dy });
        event.preventDefault();
      }
    };

    const onUp = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      pointers.delete(event.pointerId);
      if (drag?.active) suppressClick.current = true;
      if (pointers.size === 1) {
        const [remaining] = [...pointers.values()];
        drag = { ...remaining, view: { ...view.current }, active: true };
        pinch = null;
      } else if (pointers.size === 0) {
        drag = null;
        pinch = null;
      }
    };

    const onWheel = (event: WheelEvent) => {
      // Plain wheel scrolls the page; ctrl/cmd wheel and trackpad pinch zoom.
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const point = local(event);
      const { k, x, y } = view.current;
      // Trackpad pinches send small deltas; a mouse notch sends ~100. Capping the
      // step keeps one notch from jumping straight to maximum zoom.
      const step = Math.max(-40, Math.min(40, event.deltaY));
      const next = Math.min(Math.max(k * Math.exp(-step * 0.01), viewport.current.fit), maxScale);
      const cx = (point.x - x) / k;
      const cy = (point.y - y) / k;
      apply({ k: next, x: point.x - cx * next, y: point.y - cy * next });
      markInteracted();
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      event.stopPropagation();
      event.preventDefault();
    };

    svg.addEventListener("pointerdown", onDown);
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointercancel", onUp);
    svg.addEventListener("wheel", onWheel, { passive: false });
    svg.addEventListener("click", onClickCapture, true);
    return () => {
      svg.removeEventListener("pointerdown", onDown);
      svg.removeEventListener("pointermove", onMove);
      svg.removeEventListener("pointerup", onUp);
      svg.removeEventListener("pointercancel", onUp);
      svg.removeEventListener("wheel", onWheel);
      svg.removeEventListener("click", onClickCapture, true);
    };
  }, [apply, markInteracted, maxScale, svgRef]);

  useEffect(() => () => cancelAnimationFrame(tween.current), []);

  return { interacted, zoomedIn, zoomBy, showAll, centreOn, reveal };
}
