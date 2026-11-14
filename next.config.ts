import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the Next.js dev badge so each device page looks like a standalone app.
  devIndicators: false,
  // This folder is the project root (silences the "multiple lockfiles" warning from a stray ~/package-lock.json).
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
