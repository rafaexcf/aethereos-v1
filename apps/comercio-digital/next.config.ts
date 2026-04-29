import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@aethereos/ui-shell",
    "@aethereos/kernel",
    "@aethereos/scp-registry",
    "@aethereos/drivers",
    "@aethereos/drivers-supabase",
  ],

  webpack(config) {
    config.resolve ??= {};
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },

  async headers() {
    const isDev =
      process.env["NODE_ENV"] === "development" ||
      process.env["NODE_ENV"] === "test";

    const frameAncestors = isDev
      ? "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*"
      : `frame-ancestors 'self' ${process.env["ALLOWED_EMBED_ORIGINS"] ?? "https://*.aethereos.io https://*.b2baios.com.br"}`;

    return [
      {
        source: "/embed/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: frameAncestors,
          },
        ],
      },
    ];
  },
};

export default nextConfig;
