import type { NextConfig } from "next";
import "./src/lib/env";

const nextConfig: NextConfig = {
  turbopack: {},
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
