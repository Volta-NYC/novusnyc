/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
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
