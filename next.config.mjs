/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";
const shouldUpgradeInsecureRequests = isProduction && process.env.VERCEL_ENV === "production";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https:",
  "object-src 'none'",
  ...(shouldUpgradeInsecureRequests ? ["upgrade-insecure-requests"] : []),
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-site" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig = {
  poweredByHeader: false,
  images: {
    // businesses.showcase_image_url may point at a partner's own domain. Any
    // host used there MUST be listed, or next/image throws and the whole
    // /showcase route 500s. Prefer uploading partner logos to Supabase Storage
    // so this list does not have to grow with every new partner.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thzvuxuqvjkifpxlmoqc.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "readyset1600.org",
      },
    ],
    // Serve WebP/AVIF where supported and cache optimized images on Vercel CDN.
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
  async headers() {
    return [
      // Security headers applied to every response.
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      ...(isProduction
        ? [{
          source: "/_next/static/:path*",
          headers: [
            { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          ],
        }]
        : []),
      // Cache showcase images served through the local API route.
      {
        source: "/api/showcase-image/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800" },
        ],
      },
      // Cache the OG image (generated per-deploy, stable content).
      {
        source: "/api/og",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" },
        ],
      },
    ];
  },
  async redirects() {
    // Pre-rebrand hosts. Each 301s path-for-path so deep links survive.
    //
    // www.novusnyc.org is the canonical host — Vercel already 301s the apex to
    // www, so listing www here would redirect it back to the apex and loop.
    const OLD_HOSTS = [
      "voltanyc.org",
      "www.voltanyc.org",
      "nyc.voltanpo.org",
      "volta-nyc.vercel.app",
      "novus-nyc.vercel.app",
    ];
    return [
      {
        source: "/contact",
        destination: "/partners",
        permanent: true,
      },
      ...OLD_HOSTS.map((host) => ({
        source: "/:path*",
        has: [{ type: "host", value: host }],
        destination: `https://www.novusnyc.org/:path*`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
