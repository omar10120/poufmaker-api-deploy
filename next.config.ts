import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  swcMinify: true,
  reactStrictMode: true,
};

export default nextConfig;
