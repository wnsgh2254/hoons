import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Explicit root so Turbopack is not confused by multiple lockfiles (root vs haeyoom)
  // Uses process.cwd(), which will be the haeyoom folder when you run `npm run dev` there.
  turbopack: {
    root: path.join(process.cwd()),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.figma.com",
        pathname: "/api/mcp/asset/**",
      },
    ],
  },
};

export default nextConfig;
