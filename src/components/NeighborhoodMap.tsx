"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface BusinessMarker {
  name: string;
  type: string;
  services: string;
  lat: number;
  lng: number;
  neighborhood: string;
  status: "Active" | "In Progress" | "Upcoming";
}

const neighborhoods = [
  { name: "Park Slope", borough: "Brooklyn", lat: 40.6710, lng: -73.9769 },
  { name: "Sunnyside", borough: "Queens", lat: 40.7440, lng: -73.9213 },
  { name: "Chinatown", borough: "Manhattan", lat: 40.7158, lng: -73.9970 },
  { name: "Long Island City", borough: "Queens", lat: 40.7447, lng: -73.9485 },
  { name: "Cypress Hills", borough: "Brooklyn", lat: 40.6760, lng: -73.8822 },
  { name: "Flatbush", borough: "Brooklyn", lat: 40.6501, lng: -73.9496 },
  { name: "Flushing", borough: "Queens", lat: 40.7674, lng: -73.8330 },
  { name: "Mott Haven", borough: "Bronx", lat: 40.8082, lng: -73.9256 },
  { name: "Bayside", borough: "Queens", lat: 40.7638, lng: -73.7694 },
];

const businesses: BusinessMarker[] = [
  {
    name: "Souk Al Shater",
    type: "Lebanese Restaurant",
    services: "Website",
    lat: 40.7440,
    lng: -73.9213,
    neighborhood: "Sunnyside, Queens",
    status: "In Progress",
  },
  {
    name: "Higher Learning",
    type: "Tutoring Center",
    services: "Website, SEO",
    lat: 40.7158,
    lng: -73.9970,
    neighborhood: "Chinatown, Manhattan",
    status: "In Progress",
  },
  {
    name: "Anatolico",
    type: "Turkish Home Goods",
    services: "Social Media",
    lat: 40.6720,
    lng: -73.9775,
    neighborhood: "Park Slope, Brooklyn",
    status: "Active",
  },
  {
    name: "The Painted Pot",
    type: "Pottery Studio",
    services: "SEO, Google Maps",
    lat: 40.6700,
    lng: -73.9785,
    neighborhood: "Park Slope, Brooklyn",
    status: "Active",
  },
  {
    name: "Juliette Floral Design",
    type: "Flower Shop",
    services: "Website",
    lat: 40.6735,
    lng: -73.9760,
    neighborhood: "Park Slope, Brooklyn",
    status: "Upcoming",
  },
  {
    name: "Bayaal",
    type: "African Home Goods",
    services: "Website, Social Media",
    lat: 40.6695,
    lng: -73.9790,
    neighborhood: "Park Slope, Brooklyn",
    status: "Upcoming",
  },
];

const statusColor: Record<BusinessMarker["status"], string> = {
  Active: "#85CC17",
  "In Progress": "#3B74ED",
  Upcoming: "#9CA3AF",
};

const statusLabel: Record<BusinessMarker["status"], string> = {
  Active: "Active",
  "In Progress": "In Progress",
  Upcoming: "Upcoming",
};

export default function NeighborhoodMap() {
  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[40.720, -73.930]}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Neighborhood coverage rings */}
        {neighborhoods.map((n) => (
          <CircleMarker
            key={n.name}
            center={[n.lat, n.lng]}
            radius={22}
            fillColor="#85CC17"
            fillOpacity={0.08}
            color="#85CC17"
            weight={1.5}
            opacity={0.3}
          >
            <Popup>
              <div style={{ fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.5 }}>
                <strong>{n.name}</strong><br />
                <span style={{ color: "#6B7280", fontSize: 11 }}>{n.borough}</span>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Business dots */}
        {businesses.map((b) => (
          <CircleMarker
            key={b.name}
            center={[b.lat, b.lng]}
            radius={9}
            fillColor={statusColor[b.status]}
            fillOpacity={b.status === "Upcoming" ? 0.5 : 0.9}
            color={statusColor[b.status]}
            weight={2}
          >
            <Popup>
              <div style={{ fontFamily: "sans-serif", fontSize: 13, lineHeight: 1.6, minWidth: 160 }}>
                <strong style={{ fontSize: 14 }}>{b.name}</strong><br />
                <span style={{ color: "#6B7280", fontSize: 11 }}>{b.type}</span><br />
                <span style={{ color: "#6B7280", fontSize: 11 }}>{b.neighborhood}</span><br />
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: statusColor[b.status] }}>
                    {statusLabel[b.status]}
                  </span>
                  <span style={{ fontSize: 11, color: "#374151" }}>·</span>
                  <span style={{ fontSize: 11, color: "#374151" }}>{b.services}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 16,
          zIndex: 1000,
          background: "rgba(255,255,255,0.95)",
          border: "1px solid #E5E5DF",
          borderRadius: 12,
          padding: "10px 14px",
          fontSize: 11,
          lineHeight: 1.7,
          fontFamily: "sans-serif",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#85CC17", display: "inline-block" }} />
          <span style={{ color: "#374151" }}>Active</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3B74ED", display: "inline-block" }} />
          <span style={{ color: "#374151" }}>In Progress</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#9CA3AF", display: "inline-block" }} />
          <span style={{ color: "#374151" }}>Upcoming</span>
        </div>
      </div>
    </div>
  );
}
