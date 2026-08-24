import type { NextConfig } from "next";

// React dev mode uses eval() to reconstruct stack traces for debugging;
// it never does in production, so 'unsafe-eval' is scoped to dev only.
const scriptSrc = process.env.NODE_ENV === 'production'
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval'";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: `default-src 'self'; script-src ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' https: data: blob:; connect-src 'self'; frame-ancestors 'none'` },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
