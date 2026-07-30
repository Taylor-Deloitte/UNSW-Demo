import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
};

export default config;
