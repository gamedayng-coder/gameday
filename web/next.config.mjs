/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone output packages everything needed for Docker deployment
  output: 'standalone',
  // better-sqlite3 is a native Node.js addon — keep it server-only, never bundle it
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
};

export default nextConfig;
