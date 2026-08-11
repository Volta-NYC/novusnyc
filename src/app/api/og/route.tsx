/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;
  const bgSrc = `${origin}/hero-nyc-skyline.jpg`;
  const logoSrc = `${origin}/logo.png`;
  const fontSrc = `${origin}/fonts/Sora-Bold-Latin.woff2`;
  const wordmarkFont = await fetch(fontSrc).then((res) => res.arrayBuffer());

  // Exact desktop hero clamp math at 1200px OG width:
  // font-size: clamp(4.8rem, 13.6vw, 9.2rem) => 147.2px
  // logo height: clamp(6.6rem, 19vw, 13.1rem) => 209.6px
  // Width follows the mark's true 1.115:1 aspect — a mismatched box would
  // letterbox it and render the mark smaller than the wordmark expects.
  const heroFontSize = 147.2;
  const heroLogoHeight = 209.6;
  const heroLogoWidth = Math.round(heroLogoHeight * 1.115);
  const heroGap = 14; // md:gap-3.5

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
            // Matches .home-shared-wash from globals.css
            background:
              "linear-gradient(145deg,rgba(35,31,36,.62),rgba(66,45,52,.46) 38%,rgba(35,31,36,.56)),radial-gradient(120% 100% at 24% -8%,rgba(246,183,141,.22) 0,rgba(246,183,141,0) 66%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            // Matches .hero-vignette from globals.css
            background:
              "radial-gradient(circle at 50% 40%,transparent 16%,rgba(0,0,0,.24) 70%,rgba(0,0,0,.46) 100%),linear-gradient(180deg,rgba(0,0,0,.32),rgba(0,0,0,.08) 32%,rgba(0,0,0,.44))",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            width: "100%",
            height: "100%",
            paddingTop: "64px", // aligns with hero pt-16
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "1024px", // max-w-5xl
              paddingLeft: "32px", // px-8
              paddingRight: "32px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: `${heroGap}px`,
                textShadow: "0 10px 28px rgba(0, 0, 0, 0.55)",
                lineHeight: 1,
              }}
            >
              <img
                src={logoSrc}
                alt="Novus NYC logo"
                width={heroLogoWidth}
                height={heroLogoHeight}
                style={{ objectFit: "contain" }}
              />
              <div
                style={{
                  color: "#F6B78D",
                  fontSize: `${heroFontSize}px`,
                  fontWeight: 700,
                  letterSpacing: "-0.025em", // tracking-tight
                  lineHeight: 1,
                  fontFamily: "Sora",
                }}
              >
                NOVUS
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Sora",
          data: wordmarkFont,
          weight: 700,
          style: "normal",
        },
      ],
    }
  );
}
