/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
    // Su Vercel i font di pdfkit (usati da @react-pdf/renderer) non vengono
    // inclusi automaticamente nel pacchetto: li forziamo per le route PDF.
    outputFileTracingIncludes: {
      "/api/script-pdf/**": ["./node_modules/pdfkit/**/*"],
      "/api/social-script-pdf/**": ["./node_modules/pdfkit/**/*"],
    },
  },
};

module.exports = nextConfig;
