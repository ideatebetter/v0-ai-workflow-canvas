/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  devIndicators: false,
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
