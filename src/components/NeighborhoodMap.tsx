"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
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
  status: "Active" | "In Progress" | "Upcoming";
  url?: string;
  colorClass: string;
  source?: "business" | "bid";
}

interface NeighborhoodMapProps {
  projects: MapProject[];
}

function FitMapToPoints({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(points, { padding: [56, 56], animate: false });
    // Slightly zoom out after fitting so edge circles are reliably visible on first load.
    map.setZoom(Math.max(map.getZoom() - 0.25, 9));
  }, [map, points]);

  return null;
}

// Derive precise map hex colors from Tailwind classes
const getColorHex = (colorClass: string): string => {
  if (colorClass.includes("blue-300")) return "#93C5FD";
  if (colorClass.includes("blue-500")) return "#3B82F6";
  if (colorClass.includes("blue-700")) return "#1D4ED8";
  if (colorClass.includes("lime-300")) return "#BEF264";
  if (colorClass.includes("lime-500")) return "#84CC16";
  if (colorClass.includes("lime-700")) return "#3F6212";
  if (colorClass.includes("amber-300")) return "#FCD34D";
  if (colorClass.includes("amber-500")) return "#F59E0B";
  if (colorClass.includes("amber-700")) return "#B45309";
  if (colorClass.includes("pink-300")) return "#F9A8D4";
  if (colorClass.includes("pink-500")) return "#EC4899";
  if (colorClass.includes("pink-700")) return "#9D174D";
  if (colorClass.includes("purple-500")) return "#8B5CF6";
  if (colorClass.includes("red-300")) return "#FCA5A5";
  if (colorClass.includes("red-500")) return "#EF4444";
  if (colorClass.includes("red-700")) return "#991B1B";
  return "#3B82F6"; // fallback
};

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
  Brooklyn: "#A3E635", // lime-400
  Queens: "#93C5FD", // blue-300
  Manhattan: "#FBBF24", // amber-400
  Bronx: "#C084FC", // purple-400
  "Staten Island": "#FB7185", // rose-400
};

export default function NeighborhoodMap({ projects }: NeighborhoodMapProps) {
  const markers = useMemo(
    () =>
      projects
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p) => {
        const borough = normalizeBorough(p.borough ?? p.neighborhood);
        const isBid = p.source === "bid";
        const hex = isBid
          ? (BOROUGH_HEX[borough] ?? "#94A3B8")
          : getColorHex(p.colorClass);
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
            fillOpacity={0.2}
            color={b.hex}
            opacity={0.55}
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
