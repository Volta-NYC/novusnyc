"use client";

import {
  AttributionControl,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");

function MapLoadingState() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-n-bg" role="status" aria-label="Loading project map">
      <div className="w-full max-w-xl px-8">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-3 w-3 animate-pulse rounded-full bg-n-orange" />
          <span className="h-2.5 w-32 animate-pulse rounded-full bg-n-border" />
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

interface PreparedMarker extends MapProject {
  borough: string;
  isBid: boolean;
  lat: number;
  lng: number;
  hex: string;
  textHex: string;
}

const NYC_COORDINATE_BOUNDS = {
  minLat: 40.45,
  maxLat: 40.95,
  minLng: -74.35,
  maxLng: -73.65,
};

const CARTO_STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

function getCartoStyleUrl(): string {
  const key = process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY?.trim();
  return key ? `${CARTO_STYLE_URL}?key=${encodeURIComponent(key)}` : CARTO_STYLE_URL;
}

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

const MARKER_HEX: Array<{ match: string; fill: string; text: string }> = [
  { match: "violet-200", fill: "#DDD6FE", text: "#6D28D9" },
  { match: "violet-300", fill: "#C4B5FD", text: "#6D28D9" },
  { match: "violet-400", fill: "#A78BFA", text: "#5B21B6" },
  { match: "orange-200", fill: "#FED7AA", text: "#C2410C" },
  { match: "orange-300", fill: "#FDBA74", text: "#C2410C" },
  { match: "orange-400", fill: "#FB923C", text: "#9A3412" },
  { match: "amber-200", fill: "#FDE68A", text: "#B45309" },
  { match: "amber-300", fill: "#FCD34D", text: "#B45309" },
  { match: "amber-400", fill: "#FBBF24", text: "#92400E" },
  { match: "fuchsia-200", fill: "#F5D0FE", text: "#A21CAF" },
  { match: "fuchsia-300", fill: "#F0ABFC", text: "#A21CAF" },
  { match: "fuchsia-400", fill: "#E879F9", text: "#86198F" },
  { match: "purple-300", fill: "#D8B4FE", text: "#7E22CE" },
  { match: "rose-200", fill: "#FECDD3", text: "#BE123C" },
  { match: "rose-300", fill: "#FDA4AF", text: "#BE123C" },
  { match: "rose-400", fill: "#FB7185", text: "#9F1239" },
];

const FALLBACK_MARKER = { fill: "#C4B5FD", text: "#6D28D9" };

const getMarkerColors = (colorClass: string): { fill: string; text: string } =>
  MARKER_HEX.find((color) => colorClass.includes(color.match)) ?? FALLBACK_MARKER;

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

const BOROUGH_HEX: Record<string, { fill: string; text: string }> = {
  Brooklyn: { fill: "#FDBA74", text: "#C2410C" },
  Queens: { fill: "#C4B5FD", text: "#6D28D9" },
  Manhattan: { fill: "#FCD34D", text: "#B45309" },
  Bronx: { fill: "#D8B4FE", text: "#7E22CE" },
  "Staten Island": { fill: "#FDA4AF", text: "#BE123C" },
};

const BOROUGH_FALLBACK = { fill: "#CBD5E1", text: "#475569" };

function appendTextLine(parent: HTMLElement, text: string, className: string) {
  const line = document.createElement("div");
  line.className = className;
  line.textContent = text;
  parent.appendChild(line);
}

function createPopupContent(marker: PreparedMarker): HTMLElement {
  const content = document.createElement("div");
  content.className = "novus-map-popup";

  appendTextLine(content, marker.name, "novus-map-popup__title");
  appendTextLine(content, marker.type, "novus-map-popup__muted");
  appendTextLine(content, marker.neighborhood, "novus-map-popup__muted");

  const details = document.createElement("div");
  details.className = "novus-map-popup__details";

  const status = document.createElement("span");
  status.className = "novus-map-popup__status";
  status.style.color = marker.textHex;
  status.textContent = marker.status;
  details.appendChild(status);

  if (marker.services.length > 0) {
    const separator = document.createElement("span");
    separator.textContent = "·";
    details.appendChild(separator);

    const services = document.createElement("span");
    services.textContent = marker.services.join(", ");
    details.appendChild(services);
  }

  content.appendChild(details);

  if (marker.url) {
    const link = document.createElement("a");
    link.className = "novus-map-popup__link";
    link.style.color = marker.textHex;
    link.href = marker.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View →";
    content.appendChild(link);
  }

  return content;
}

function createMarkerElement(marker: PreparedMarker): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "novus-map-marker";
  button.setAttribute("aria-label", `View ${marker.name} on the map`);

  const dot = document.createElement("span");
  dot.className = marker.isBid ? "novus-map-marker__dot novus-map-marker__dot--partner" : "novus-map-marker__dot";
  dot.style.backgroundColor = marker.isBid ? `${marker.hex}24` : marker.hex;
  dot.style.borderColor = marker.isBid ? `${marker.textHex}73` : marker.textHex;
  button.appendChild(dot);

  return button;
}

export default function NeighborhoodMap({ projects }: NeighborhoodMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hintTimerRef = useRef<number>();
  const [showZoomHint, setShowZoomHint] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [zoomModifierLabel, setZoomModifierLabel] = useState("Ctrl");

  const markers = useMemo<PreparedMarker[]>(
    () =>
      projects.filter((project) => isNycCoordinate(project.lat, project.lng)).map((project) => {
        const borough = normalizeBorough(project.borough ?? project.neighborhood);
        const isBid = project.source === "bid";
        const markerColor = isBid ? (BOROUGH_HEX[borough] ?? BOROUGH_FALLBACK) : getMarkerColors(project.colorClass);

        return {
          ...project,
          borough,
          isBid,
          lat: Number(project.lat),
          lng: Number(project.lng),
          hex: markerColor.fill,
          textHex: markerColor.text,
        };
      }),
    [projects],
  );

  useEffect(() => {
    if (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent)) setZoomModifierLabel("⌘");
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setMapLoaded(false);
    const map = new MapLibreMap({
      container,
      style: getCartoStyleUrl(),
      center: [-73.94, 40.7],
      zoom: 11,
      minZoom: 0,
      maxZoom: 20,
      attributionControl: false,
      scrollZoom: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      maxPitch: 0,
    });

    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new AttributionControl({ compact: true }), "bottom-right");

    for (const marker of markers) {
      const popup = new Popup({ offset: marker.isBid ? 12 : 8, maxWidth: "280px" }).setDOMContent(createPopupContent(marker));
      new Marker({ element: createMarkerElement(marker), anchor: "center" })
        .setLngLat([marker.lng, marker.lat])
        .setPopup(popup)
        .addTo(map);
    }

    map.once("load", () => {
      if (markers.length > 0) {
        const bounds = new LngLatBounds();
        for (const marker of markers) bounds.extend([marker.lng, marker.lat]);
        const camera = map.cameraForBounds(bounds, { padding: 42 });
        if (camera) {
          map.jumpTo(camera);
          map.setMinZoom(camera.zoom);
        }
      }
      setMapLoaded(true);
    });

    const onWheel = (event: WheelEvent) => {
      if (event.metaKey || event.ctrlKey) {
        event.preventDefault();
        window.clearTimeout(hintTimerRef.current);
        setShowZoomHint(false);

        const rect = container.getBoundingClientRect();
        const around = map.unproject([event.clientX - rect.left, event.clientY - rect.top]);
        const step = event.deltaY < 0 ? 0.5 : -0.5;
        const zoom = Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), map.getZoom() + step));
        map.easeTo({ zoom, around, duration: 0 });
        return;
      }

      setShowZoomHint(true);
      window.clearTimeout(hintTimerRef.current);
      hintTimerRef.current = window.setTimeout(() => setShowZoomHint(false), 1300);
    };

    const onMouseLeave = () => {
      window.clearTimeout(hintTimerRef.current);
      setShowZoomHint(false);
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    container.addEventListener("mouseleave", onMouseLeave);

    return () => {
      window.clearTimeout(hintTimerRef.current);
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("mouseleave", onMouseLeave);
      map.remove();
    };
  }, [markers]);

  return (
    <div className="relative z-0 h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label="Interactive map of Novus NYC business locations across New York City"
      />

      {!mapLoaded && (
        <div className="absolute inset-0 z-[2]">
          <MapLoadingState />
        </div>
      )}

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-[3] flex items-center justify-center transition-opacity duration-200 ${
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
