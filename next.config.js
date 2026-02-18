/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['nodemailer'],
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
