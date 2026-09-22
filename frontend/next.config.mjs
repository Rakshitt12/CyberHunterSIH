/** @type {import('next').NextConfig} */

// Single-URL deployment: the browser only talks to this Next.js origin.
// /api/* requests are proxied server-side to the real backend, so the
// backend domain never appears in client code or the browser address bar.
// Destination is env-driven: localhost:8001 for local dev (.env.local),
// the Render URL in the Vercel project environment for production.
const BACKEND_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8001";

const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;

