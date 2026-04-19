import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Next.js dev resources (HMR, etc.) to load when accessed via the Serveo tunnel.
  // Serveo subdomain changes on each restart — use wildcard to cover all sessions.
  allowedDevOrigins: ["*.serveousercontent.com"],
};

export default nextConfig;
