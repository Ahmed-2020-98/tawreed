import { next } from '@tawreed/eslint-config/next';

export default [
  ...next,
  { ignores: ['.next/**', 'next-env.d.ts', 'eslint.config.js', 'postcss.config.mjs', 'playwright-report/**', 'test-results/**', 'public/**', 'scripts/**'] },
  {
    rules: {
      // Images are served by the API as pre-sized webp variants (thumb/md/full) with images.unoptimized.
      '@next/next/no-img-element': 'off',
    },
  },
];
