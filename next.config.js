/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // 忽略 chrome-extension 目录
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/chrome-extension/**'],
    };
    return config;
  },
};

module.exports = nextConfig;
