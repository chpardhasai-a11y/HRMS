import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  experimental: {
    devtoolSegmentExplorer: false
  },
  outputFileTracingRoot: __dirname
};

export default nextConfig;
