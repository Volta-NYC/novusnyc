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
            background: "rgba(6, 11, 18, 0.58)",
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
          <div style={{ display: "flex", alignItems: "center", gap: "26px" }}>
            <img
              src={logoSrc}
              alt="Volta logo"
              width={150}
              height={150}
              style={{ objectFit: "contain" }}
            />
            <div
              style={{
                color: "#85CC17",
                fontSize: "142px",
                lineHeight: 1,
                fontWeight: 800,
                letterSpacing: "0.06em",
                fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
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
