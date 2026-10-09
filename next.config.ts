import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standard von Next.js 16.4: Cache Components und Partial Prefetching.
  // Beide werden mit der nächsten Hauptversion ohnehin immer aktiv sein.
  cacheComponents: true,
  partialPrefetching: true,
  // Sonst legt `next dev` bei erkannten KI-Assistenten eine AGENTS.md an.
  // Für dieses Projekt ist CLAUDE.md die einzige Arbeitsanleitung.
  agentRules: false,
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
