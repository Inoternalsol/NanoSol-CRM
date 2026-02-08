import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
    swSrc: "app/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
    /* 
      Cleaned up to resolve Webpack runtime TypeErrors in Next.js 15 / React 19.
      Removed esmExternals: 'loose' and transpilePackages: ['framer-motion'] 
      as they are often unnecessary and can conflict with the new bundler.
    */
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default withSerwist(nextConfig);
