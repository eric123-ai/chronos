import type { NextConfig } from "next";

function toAllowedDevOrigin(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
}

const apiOrigin = process.env.NEXT_PUBLIC_API_URL
  ? [toAllowedDevOrigin(process.env.NEXT_PUBLIC_API_URL)]
  : [];

const localDevOrigins = [
  "127.0.0.1",
  "localhost",
  "0.0.0.0",
];

const nextConfig: NextConfig = {
  allowedDevOrigins: [...new Set([...apiOrigin, ...localDevOrigins])],
  turbopack: {},
};

export default nextConfig;
