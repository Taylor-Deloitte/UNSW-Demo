import type { NextConfig } from 'next';

const config: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  // Routes under /api read data/*.json at runtime via fs — Next's standalone
  // output tracer can't see that dynamic read, so without this the generated
  // data never makes it into .next/standalone and every API route 500s in prod.
  outputFileTracingIncludes: {
    '/api/**': ['./data/**/*'],
  },
};

export default config;
