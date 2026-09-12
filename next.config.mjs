/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
      "pk_test_ZHVtbXkuY2xlcmsuYWNjb3VudHMuZGV2JA",
    CLERK_SECRET_KEY:
      process.env.CLERK_SECRET_KEY ||
      "sk_test_dummy_clerk_secret_key_for_build_purposes_only",
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/sensai",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "randomuser.me",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
