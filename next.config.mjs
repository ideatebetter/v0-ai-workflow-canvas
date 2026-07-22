import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: false,
  // Pin the workspace root — a stray package-lock.json in the parent tree
  // would otherwise cause Turbopack to infer the wrong root and slow HMR.
  turbopack: {
    root: __dirname,
  },
  // Explicitly include the pdfjs worker in the /api/parse-pdf function bundle.
  // pdfjs uses /*webpackIgnore*/ on its own worker import, so Next.js file
  // tracing skips it unless we declare it here.
  outputFileTracingIncludes: {
    "/api/parse-pdf": [
      "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
}

export default nextConfig
