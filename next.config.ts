import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse and canvas are CJS and must be external to avoid webpack bundling issues.
  // pdfjs-dist is pure ESM — it is loaded via dynamic import() in the API route,
  // so it must NOT be in serverExternalPackages (Next.js can't externalize ESM packages).
  serverExternalPackages: ['pdf-parse', 'canvas'],
};

export default nextConfig;
