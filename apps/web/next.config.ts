import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typescript: {
    // Bun's content-addressable store creates a duplicate @types/react at
    // node_modules/.bun/@types+react@x.x.x/node_modules/@types/react/.
    // TypeScript treats identical types from the two paths as incompatible,
    // causing errors like "Two different types with this name exist, but they
    // are unrelated" in shadcn/ui components. skipLibCheck doesn't help
    // because the error is in .tsx source files, not .d.ts files.
    // Type checking can still be done locally with `tsc --noEmit`.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
