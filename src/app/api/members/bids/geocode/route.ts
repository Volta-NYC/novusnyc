import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildQuery(address: string, zipCode: string, borough: string): string {
  const parts: string[] = [];
  if (address) parts.push(address);
  if (borough) parts.push(`${borough}, NYC`);
  if (zipCode) parts.push(zipCode);
  parts.push("New York, NY");
  return parts.join(", ");
}

async function geocodeWithGoogle(query: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = await res.json() as {
    status?: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
  };

  if (data.status !== "OK") return null;
  const first = data.results?.[0];
  const lat = first?.geometry?.location?.lat;
  const lng = first?.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return {
    lat,
    lng,
    formattedAddress: first?.formatted_address ?? query,
  };
}

async function geocodeWithNominatim(query: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "VoltaNYC/1.0 (info@voltanyc.org)",
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;

  const rows = await res.json() as Array<{
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;

  const first = rows?.[0];
  if (!first?.lat || !first?.lon) return null;
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return {
    lat,
    lng,
    formattedAddress: first.display_name ?? query,
  };
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin", "project_lead"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  try {
    const body = await req.json() as { address?: string; zipCode?: string; borough?: string };
    const address = asText(body.address);
    const zipCode = asText(body.zipCode);
    const borough = asText(body.borough);
    if (!address && !zipCode) {
      return NextResponse.json({ error: "missing_location" }, { status: 422 });
    }

    const query = buildQuery(address, zipCode, borough);

    const google = await geocodeWithGoogle(query);
    if (google) {
      return NextResponse.json({
        ok: true,
        lat: google.lat,
        lng: google.lng,
        formattedAddress: google.formattedAddress,
        provider: "google",
      });
    }

    const nominatim = await geocodeWithNominatim(query);
    if (nominatim) {
      return NextResponse.json({
        ok: true,
        lat: nominatim.lat,
        lng: nominatim.lng,
        formattedAddress: nominatim.formattedAddress,
        provider: "nominatim",
      });
    }

    return NextResponse.json({ error: "geocode_not_found" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
}
