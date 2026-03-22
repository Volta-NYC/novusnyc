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
            background:
              "linear-gradient(110deg, rgba(5,8,13,0.86) 5%, rgba(5,8,13,0.58) 48%, rgba(5,8,13,0.72) 100%)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "58px 64px",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
            <img
              src={logoSrc}
              alt="Volta logo"
              width={90}
              height={90}
              style={{ objectFit: "contain" }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  color: "#85CC17",
                  fontSize: "88px",
                  lineHeight: 1,
                  fontWeight: 800,
                  letterSpacing: "0.04em",
                }}
              >
                VOLTA
              </div>
              <div
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontSize: "30px",
                  lineHeight: 1.1,
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}
              >
                NYC
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                color: "rgba(255,255,255,0.96)",
                fontSize: "38px",
                lineHeight: 1.1,
                fontWeight: 700,
              }}
            >
              Student teams shipping real work for small businesses.
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.78)",
                fontSize: "23px",
                lineHeight: 1.25,
                fontWeight: 500,
              }}
            >
              Websites, marketing, finance, and operations support through Volta NYC.
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
