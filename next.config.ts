import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  // Next.js 16 blocks cross-origin access to /_next/* in development.
  // LAN IP / hostname access needs an allowlist (localhost is allowed by default).
  allowedDevOrigins: [
    '192.168.*.*',
    '10.*.*.*',
    '172.16.*.*',
    '172.17.*.*',
    '172.18.*.*',
    '172.19.*.*',
    '172.20.*.*',
    '172.21.*.*',
    '172.22.*.*',
    '172.23.*.*',
    '172.24.*.*',
    '172.25.*.*',
    '172.26.*.*',
    '172.27.*.*',
    '172.28.*.*',
    '172.29.*.*',
    '172.30.*.*',
    '172.31.*.*',
    '*.local',
  ],
};

export default nextConfig;
