import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker deployment — generates a standalone build
  // that includes only the files needed to run the app
  output: "standalone",
};

export default nextConfig;
