/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  // Minified stacks from real users were arriving as "at Ui@" with a mangled
  // property name - impossible to act on. The source is already public on
  // GitHub, so there is nothing to protect by withholding these.
  productionBrowserSourceMaps: true,
};

export default nextConfig;
