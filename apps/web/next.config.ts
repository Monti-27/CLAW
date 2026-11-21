import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * `next dev` only serves its scripts to localhost by default, so opening the dev server from
   * another device (your Wi-Fi IP) or a tunnel (ngrok) shows a blank page. These hosts are allowed
   * in development only; production builds are unaffected.
   */
  allowedDevOrigins: [
    "192.168.*.*",
    "10.*.*.*",
    "172.16.*.*",
    "*.local",
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
    "*.trycloudflare.com",
  ],
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
