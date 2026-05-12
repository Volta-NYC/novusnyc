/** @type {import('next').NextConfig} */
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
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
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
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thzvuxuqvjkifpxlmoqc.supabase.co",
        pathname: "/storage/v1/object/public/**",
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
      // Long-lived immutable cache for hashed Next.js static chunks.
      // Vercel sets this automatically but being explicit ensures it applies
      // even when headers() runs after Vercel's built-in layer.
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
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
    const OLD_HOSTS = [
      "nyc.voltanpo.org",
      "www.voltanyc.org",
      "volta-nyc.vercel.app",
    ];
    return [
      {
        source: "/contact",
        destination: "/partners",
        permanent: true,
      },
      {
        source: "/members/assignments/by-business",
        destination: "/members/assignments/by-project",
        permanent: true,
      },
      ...OLD_HOSTS.map((host) => ({
        source: "/:path*",
        has: [{ type: "host", value: host }],
        destination: `https://voltanyc.org/:path*`,
        permanent: true,
      })),
    ];
  },
};

export default nextConfig;
