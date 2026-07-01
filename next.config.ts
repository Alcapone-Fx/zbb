import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/offline",
  },
  runtimeCaching: [
    // Supabase storage — long-lived assets
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/,
      handler: "CacheFirst",
      options: {
        cacheName: "supabase-storage",
        expiration: { maxAgeSeconds: 86400 },
      },
    },
    // Supabase REST/Auth API — network-first, short cache
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/(rest|auth)\/.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "supabase-api",
        networkTimeoutSeconds: 10,
        expiration: { maxAgeSeconds: 300, maxEntries: 50 },
      },
    },
    // Local API routes — network-first
    {
      urlPattern: /^\/api\/.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        networkTimeoutSeconds: 10,
        expiration: { maxAgeSeconds: 120, maxEntries: 100 },
      },
    },
    // Google Fonts stylesheet (next/font/google serves these at build time,
    // but cache as fallback for repeat visits)
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "google-fonts-stylesheets",
        expiration: { maxAgeSeconds: 604800 },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/,
      handler: "CacheFirst",
      options: {
        cacheName: "google-fonts-webfonts",
        expiration: { maxAgeSeconds: 31536000 },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  turbopack: {},
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
};

export default withPWA(nextConfig);
