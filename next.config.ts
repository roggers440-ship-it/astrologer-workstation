import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /*
   * @swisseph/node is a native N-API addon. The bundler must not try to trace or
   * inline it - it has to be required at runtime from node_modules so the
   * platform-specific binary and the bundled ephemeris data files resolve.
   */
  serverExternalPackages: ['@swisseph/node'],
};

export default nextConfig;
