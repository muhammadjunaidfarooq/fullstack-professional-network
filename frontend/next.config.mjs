/** @type {import('next').NextConfig} */

// Guard against shipping a production build that still points at localhost.
if (process.env.VERCEL === "1" && !process.env.NEXT_PUBLIC_API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not set. Add it in Vercel → Project → Settings → Environment Variables " +
      "(e.g. https://your-backend.onrender.com) and redeploy."
  );
}
if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    "\n⚠  NEXT_PUBLIC_API_URL is not set — this build will call http://localhost:9090.\n"
  );
}

const nextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
