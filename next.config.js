/** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
//   swcMinify: true,
//   experimental: {
//     appDir: true
//   }
// };

// module.exports = nextConfig;

module.exports = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true
  },
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }
  ) => {
    // https://github.com/amark/gun/issues/743#issuecomment-1153158850
    config.module.noParse = [/gun\.js$/, /sea\.js$/];
    return config;
  }
};
