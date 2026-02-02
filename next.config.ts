import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Desactivar para evitar doble renderizado que cancela requests
};

export default nextConfig;
