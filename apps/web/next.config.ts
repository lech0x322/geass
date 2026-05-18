import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpile the monorepo SDK package (TypeScript source, no pre-built dist).
  transpilePackages: ["@geass/sdk"],
};

export default nextConfig;
