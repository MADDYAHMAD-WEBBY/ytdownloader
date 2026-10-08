/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/yt-proxy/:path*',
        destination: 'https://www.youtube.com/:path*',
      },
    ];
  },
};

export default nextConfig;
