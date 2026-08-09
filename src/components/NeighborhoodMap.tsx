"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-n-bg" role="status" aria-label="Loading project map">
      <div className="w-full max-w-xl px-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-n-orange animate-pulse" />
          <span className="h-2.5 w-32 rounded-full bg-n-border animate-pulse" />
        </div>
        <div className="relative h-56 overflow-hidden rounded-xl border border-n-border bg-white">
          <span className="absolute -left-8 top-16 h-px w-[120%] rotate-[13deg] bg-n-purple/20" />
          <span className="absolute -left-8 top-32 h-px w-[120%] -rotate-[9deg] bg-n-orange/20" />
          <span className="absolute left-[28%] top-[38%] h-4 w-4 rounded-full bg-n-orange/40 ring-8 ring-n-orange/10" />
          <span className="absolute left-[63%] top-[62%] h-3 w-3 rounded-full bg-n-purple/45 ring-8 ring-n-purple/10" />
          <span className="absolute left-[78%] top-[25%] h-3 w-3 rounded-full bg-n-yellow/55 ring-8 ring-n-yellow/20" />
        </div>
      </div>
    </div>
  );
}

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false, loading: MapLoadingState });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import("react-leaflet").then((mod) => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

export interface MapProject {
  name: string;
  type: string;
  services: string[];
  neighborhood: string;
  borough?: string;
  lat?: number;
  lng?: number;
  status: "Ongoing" | "Upcoming" | "Completed";
  url?: string;
  colorClass: string;
  source?: "business" | "bid";
}

interface NeighborhoodMapProps {
  projects: MapProject[];
}

const NYC_COORDINATE_BOUNDS = {
  minLat: 40.45,
  maxLat: 40.95,
  minLng: -74.35,
  maxLng: -73.65,
};

function isNycCoordinate(lat?: number, lng?: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= NYC_COORDINATE_BOUNDS.minLat &&
    lat <= NYC_COORDINATE_BOUNDS.maxLat &&
    lng >= NYC_COORDINATE_BOUNDS.minLng &&
    lng <= NYC_COORDINATE_BOUNDS.maxLng
  );
}

/**
 * Leaflet's scroll-wheel zoom swallows wheel events, so the page scroll gets
 * trapped whenever the cursor crosses the map. `scrollWheelZoom` stays off and
 * zoom is driven manually only while a modifier key is held — the same
 * convention as embedded Google Maps.
 *
 * The listener must be non-passive: ctrl+wheel is the browser's own page-zoom
 * gesture, so without preventDefault the whole page would zoom instead of the
 * map. Zoom is applied with setZoomAround so it tracks the cursor rather than
 * the map centre.
 */
function ScrollZoomGuard({ onHintChange }: { onHintChange: (v: boolean) => void }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let hideTimer: number | undefined;

    const onWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault();
        const step = e.deltaY < 0 ? 0.5 : -0.5;
        map.setZoomAround(map.mouseEventToContainerPoint(e), map.getZoom() + step);
        window.clearTimeout(hideTimer);
        onHintChange(false);
        return;
      }
      // No modifier: do nothing. The event bubbles and the page scrolls.
      onHintChange(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => onHintChange(false), 1300);
    };

    const onLeave = () => {
      window.clearTimeout(hideTimer);
      onHintChange(false);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("mouseleave", onLeave);
    return () => {
      window.clearTimeout(hideTimer);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("mouseleave", onLeave);
    };
  }, [map, onHintChange]);

  return null;
}

function FitMapToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(points, { padding: [42, 42], animate: false });
    // Lock the minimum zoom to the fitted default view so users can zoom in,
    // but not zoom out further than the initial map extent.
    const fittedZoom = map.getZoom();
    map.setMinZoom(fittedZoom);
  }, [map, points]);

  return null;
}

// Map hexes derived from the Tailwind class on each showcase card, so a dot
// always matches its card. Each entry carries two values because the colour is
// used for two different jobs: `fill` paints the dot (pastel, per the Novus
// palette) and `text` is used for the popup label and link, which sit at 11px
// on white and would be illegible in the pastel tone.
const MARKER_HEX: Array<{ match: string; fill: string; text: string }> = [
  { match: "violet-200",  fill: "#DDD6FE", text: "#6D28D9" },
  { match: "violet-300",  fill: "#C4B5FD", text: "#6D28D9" },
  { match: "violet-400",  fill: "#A78BFA", text: "#5B21B6" },
  { match: "orange-200",  fill: "#FED7AA", text: "#C2410C" },
  { match: "orange-300",  fill: "#FDBA74", text: "#C2410C" },
  { match: "orange-400",  fill: "#FB923C", text: "#9A3412" },
  { match: "amber-200",   fill: "#FDE68A", text: "#B45309" },
  { match: "amber-300",   fill: "#FCD34D", text: "#B45309" },
  { match: "amber-400",   fill: "#FBBF24", text: "#92400E" },
  { match: "fuchsia-200", fill: "#F5D0FE", text: "#A21CAF" },
  { match: "fuchsia-300", fill: "#F0ABFC", text: "#A21CAF" },
  { match: "fuchsia-400", fill: "#E879F9", text: "#86198F" },
  { match: "purple-300",  fill: "#D8B4FE", text: "#7E22CE" },
  { match: "rose-200",    fill: "#FECDD3", text: "#BE123C" },
  { match: "rose-300",    fill: "#FDA4AF", text: "#BE123C" },
  { match: "rose-400",    fill: "#FB7185", text: "#9F1239" },
];

const FALLBACK_MARKER = { fill: "#C4B5FD", text: "#6D28D9" };

const getMarkerColors = (colorClass: string): { fill: string; text: string } =>
  MARKER_HEX.find((c) => colorClass.includes(c.match)) ?? FALLBACK_MARKER;

function normalizeBorough(value?: string): "Brooklyn" | "Queens" | "Manhattan" | "Bronx" | "Staten Island" | "" {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("brooklyn")) return "Brooklyn";
  if (raw.includes("queens")) return "Queens";
  if (raw.includes("manhattan")) return "Manhattan";
  if (raw.includes("bronx")) return "Bronx";
  if (raw.includes("staten")) return "Staten Island";
  return "";
}

// Same fill/text split as MARKER_HEX: pastel dot, readable popup label.
const BOROUGH_HEX: Record<string, { fill: string; text: string }> = {
  Brooklyn:        { fill: "#FDBA74", text: "#C2410C" }, // orange
  Queens:          { fill: "#C4B5FD", text: "#6D28D9" }, // violet
  Manhattan:       { fill: "#FCD34D", text: "#B45309" }, // amber
  Bronx:           { fill: "#D8B4FE", text: "#7E22CE" }, // purple
  "Staten Island": { fill: "#FDA4AF", text: "#BE123C" }, // rose
};

const BOROUGH_FALLBACK = { fill: "#CBD5E1", text: "#475569" };

export default function NeighborhoodMap({ projects }: NeighborhoodMapProps) {
  const markers = useMemo(
    () =>
      projects
        .filter((p) => isNycCoordinate(p.lat, p.lng))
        .map((p) => {
        const borough = normalizeBorough(p.borough ?? p.neighborhood);
        const isBid = p.source === "bid";
        const marker = isBid
          ? (BOROUGH_HEX[borough] ?? BOROUGH_FALLBACK)
          : getMarkerColors(p.colorClass);
        return {
          ...p,
          borough,
          isBid,
          lat: Number(p.lat),
          lng: Number(p.lng),
          hex: marker.fill,
          textHex: marker.text,
        };
      }),
    [projects],
  );

  const fitPoints = useMemo<[number, number][]>(() => {
    return markers.map((m) => [m.lat, m.lng] as [number, number]);
  }, [markers]);

  const [showZoomHint, setShowZoomHint] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  // Resolved after mount: reading navigator during render would make the server
  // and client disagree on the label and trip a hydration mismatch.
  const [zoomModifierLabel, setZoomModifierLabel] = useState("Ctrl");
  useEffect(() => {
    setIsMounted(true);
    if (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent)) setZoomModifierLabel("\u2318");
  }, []);

  const mapInstanceKey = useMemo(() => {
    if (!isMounted) return "map-loading";
    return `map-${fitPoints.length}`;
  }, [fitPoints.length, isMounted]);

  if (!isMounted) {
    return <MapLoadingState />;
  }

  return (
    <div className="relative w-full h-full z-0">
      <MapContainer
        key={mapInstanceKey}
        center={[40.700, -73.940]}
        zoom={11}
        zoomSnap={0.25}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        zoomControl={true}
        aria-label="Interactive map of Novus NYC business locations across New York City"
      >
        <ScrollZoomGuard onHintChange={setShowZoomHint} />
        <FitMapToPoints points={fitPoints} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* BID dots (larger, lower opacity, borough-colored) */}
        {markers.filter((m) => m.isBid).map((b, i) => (
          <CircleMarker
            key={`${b.name}-${i}`}
            center={[b.lat, b.lng]}
            radius={8}
            fillColor={b.hex}
            fillOpacity={0.14}
            color={b.textHex}
            opacity={0.45}
            weight={2}
          >
            <Popup>
              <div style={{ fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.6, minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>{b.name}</strong><br />
                <span style={{ color: "#6B7280", fontSize: 11 }}>{b.type}</span><br />
                <span style={{ color: "#6B7280", fontSize: 11 }}>{b.neighborhood}</span><br />
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: b.textHex }}>
                    {b.status}
                  </span>
                  <span style={{ fontSize: 11, color: "#374151" }}>·</span>
                  <span style={{ fontSize: 11, color: "#374151" }}>{b.services.join(", ")}</span>
                </div>
                {b.url && (
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 600, color: b.textHex, textDecoration: "none" }}
                  >
                    View →
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Business dots (smaller, solid) */}
        {markers.filter((m) => !m.isBid).map((b, i) => (
          <CircleMarker
            key={`${b.name}-${i}`}
            center={[b.lat, b.lng]}
            radius={3.5}
            fillColor={b.hex}
            fillOpacity={0.95}
            color={b.textHex}
            weight={1.25}
          >
            <Popup>
              <div style={{ fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.6, minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>{b.name}</strong><br />
                <span style={{ color: "#6B7280", fontSize: 11 }}>{b.type}</span><br />
                <span style={{ color: "#6B7280", fontSize: 11 }}>{b.neighborhood}</span><br />
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: b.textHex }}>
                    {b.status}
                  </span>
                  <span style={{ fontSize: 11, color: "#374151" }}>·</span>
                  <span style={{ fontSize: 11, color: "#374151" }}>{b.services.join(", ")}</span>
                </div>
                {b.url && (
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 600, color: b.textHex, textDecoration: "none" }}
                  >
                    View →
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-[400] flex items-center justify-center transition-opacity duration-200 ${
          showZoomHint ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="rounded-full bg-black/70 px-4 py-2 font-body text-sm font-medium text-white shadow-lg backdrop-blur-sm">
          Hold {zoomModifierLabel} and scroll to zoom
        </span>
      </div>
    </div>
  );
}
