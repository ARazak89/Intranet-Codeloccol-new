import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@monaco-editor/react'],
  webpack: (config, { isServer }) => {
    // Resolve 'react' and 'react-dom' to the local node_modules
    config.resolve.alias = {
      ...config.resolve.alias,
      'react': path.resolve(process.cwd(), 'node_modules/react'),
      'react-dom': path.resolve(process.cwd(), 'node_modules/react-dom'),
    };

    return config;
  },
};
export default nextConfig;
