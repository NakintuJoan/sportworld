/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ichef.bbci.co.uk" },
      { protocol: "https", hostname: "**.bbci.co.uk" },
      { protocol: "https", hostname: "i.guim.co.uk" },
      { protocol: "https", hostname: "**.guim.co.uk" },
      { protocol: "https", hostname: "p.imgci.com" },
      { protocol: "https", hostname: "**.imgci.com" },
      { protocol: "https", hostname: "**.365dm.com" },
      { protocol: "https", hostname: "media.zenfs.com" },
      { protocol: "https", hostname: "**.zenfs.com" },
      { protocol: "https", hostname: "**.staticflickr.com" },
      { protocol: "https", hostname: "**.ytimg.com" },
    ],
  },
  serverExternalPackages: ["node:sqlite"],
};

export default nextConfig;
