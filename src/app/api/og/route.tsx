/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const bgSrc = `${origin}/hero-nyc-skyline.jpg`;
  const logoSrc = `${origin}/logo.png`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          position: "relative",
          overflow: "hidden",
          background: "#0f1014",
        }}
      >
        <img
          src={bgSrc}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(6,11,18,0.62) 0%, rgba(6,11,18,0.62) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: "inset 0 0 180px rgba(0,0,0,0.45)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            width: "100%",
            height: "100%",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "18px", padding: "0 28px" }}>
            <img
              src={logoSrc}
              alt="Volta logo"
              width={184}
              height={184}
              style={{ objectFit: "contain" }}
            />
            <div
              style={{
                color: "#85CC17",
                fontSize: "176px",
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: "0.02em",
                textShadow: "0 10px 28px rgba(0, 0, 0, 0.55)",
                fontFamily: "\"Space Grotesk\", \"DM Sans\", system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
              }}
            >
              VOLTA
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
