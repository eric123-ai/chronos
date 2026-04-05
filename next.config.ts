import type { NextConfig } from "next";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL
  ? [process.env.NEXT_PUBLIC_API_URL]
  : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: [...apiOrigin, "http://127.0.0.1:3000", "http://localhost:3000"],
  turbopack: {},
};

export default nextConfig;
