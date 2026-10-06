import { next } from '@tawreed/eslint-config/next';

export default [
  ...next,
  { ignores: ['.next/**', 'next-env.d.ts', 'eslint.config.js', 'postcss.config.mjs', 'public/**', 'scripts/**'] },
  {
    rules: {
      // Images come from the API as pre-sized webp variants (and signed private URLs) with images.unoptimized.
      '@next/next/no-img-element': 'off',
    },
  },
];
