import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /*
   * @swisseph/node is a native N-API addon. The bundler must not try to trace or
   * inline it - it has to be required at runtime from node_modules so the
   * platform-specific binary and the bundled ephemeris data files resolve.
   */
  serverExternalPackages: ['@swisseph/node'],
  /*
   * The ephemeris binary is loaded at runtime by node-gyp-build, not by an
   * import, so Vercel's dependency tracing never sees it and leaves it out of
   * the bundle. The loader then reports "no native build found" for a file that
   * exists in node_modules but not in the deployed function.
   */
  outputFileTracingIncludes: {
    '/api/**': ['./node_modules/@swisseph/node/**'],
  },

};

export default nextConfig;
