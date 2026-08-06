"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { useMap } from "react-leaflet";
import { getShowcasePastelHex } from "@/lib/showcaseColors";
import "leaflet/dist/leaflet.css";

function MapLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-v-bg" role="status" aria-label="Loading project map">
      <div className="w-full max-w-xl px-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-v-green animate-pulse" />
          <span className="h-2.5 w-32 rounded-full bg-v-border animate-pulse" />
        </div>
        <div className="relative h-56 overflow-hidden rounded-xl border border-v-border bg-white">
          <span className="absolute -left-8 top-16 h-px w-[120%] rotate-[13deg] bg-v-blue/20" />
          <span className="absolute -left-8 top-32 h-px w-[120%] -rotate-[9deg] bg-v-green/20" />
          <span className="absolute left-[28%] top-[38%] h-4 w-4 rounded-full bg-v-green/40 ring-8 ring-v-green/10" />
          <span className="absolute left-[63%] top-[62%] h-3 w-3 rounded-full bg-v-blue/45 ring-8 ring-v-blue/10" />
          <span className="absolute left-[78%] top-[25%] h-3 w-3 rounded-full bg-v-yellow/55 ring-8 ring-v-yellow/20" />
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

const BOROUGH_HEX: Record<string, string> = {
  Brooklyn: "#65A30D", // lime-600
  Queens: "#3B82F6", // blue-500
  Manhattan: "#D97706", // amber-600
  Bronx: "#8B5CF6", // violet-500
  "Staten Island": "#E11D48", // rose-600
};

export default function NeighborhoodMap({ projects }: NeighborhoodMapProps) {
  const markers = useMemo(
    () =>
      projects
        .filter((p) => isNycCoordinate(p.lat, p.lng))
        .map((p) => {
        const borough = normalizeBorough(p.borough ?? p.neighborhood);
        const isBid = p.source === "bid";
        const hex = isBid
          ? (BOROUGH_HEX[borough] ?? "#94A3B8")
          : getShowcasePastelHex(p.colorClass);
        return {
          ...p,
          borough,
          isBid,
          lat: Number(p.lat),
          lng: Number(p.lng),
          hex,
        };
      }),
    [projects],
  );

  const fitPoints = useMemo<[number, number][]>(() => {
    return markers.map((m) => [m.lat, m.lng] as [number, number]);
  }, [markers]);

  return (
    <div className="relative w-full h-full z-0">
      <MapContainer
        center={[40.700, -73.940]}
        zoom={11}
        zoomSnap={0.25}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
        zoomControl={true}
        aria-label="Interactive map of Novus NYC business locations across New York City"
      >
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
            color={b.hex}
            opacity={0.45}
            weight={2}
          >
            <Popup>
              <div style={{ fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.6, minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>{b.name}</strong><br />
                <span style={{ color: "#6B7280", fontSize: 11 }}>{b.type}</span><br />
                <span style={{ color: "#6B7280", fontSize: 11 }}>{b.neighborhood}</span><br />
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: b.hex }}>
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
                    style={{ display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 600, color: b.hex, textDecoration: "none" }}
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
            color={b.hex}
            weight={1.25}
          >
            <Popup>
              <div style={{ fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.6, minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>{b.name}</strong><br />
                <span style={{ color: "#6B7280", fontSize: 11 }}>{b.type}</span><br />
                <span style={{ color: "#6B7280", fontSize: 11 }}>{b.neighborhood}</span><br />
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: b.hex }}>
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
                    style={{ display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 600, color: b.hex, textDecoration: "none" }}
                  >
                    View →
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

    </div>
  );
}
