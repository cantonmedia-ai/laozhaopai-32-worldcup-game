import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "laozhaopai-32-worldcup-game.vercel.app",
          },
        ],
        destination: "https://games.brainwaveai.my/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
