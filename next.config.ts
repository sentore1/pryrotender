import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CJS packages that must not be bundled by webpack/Turbopack — loaded natively at runtime.
  serverExternalPackages: ['pdf-parse', 'canvas', 'pdfjs-dist', 'mammoth', 'pdf-lib'],
};

export default nextConfig;
