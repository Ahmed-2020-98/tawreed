import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { base } from './base.js';

export const reactNative = tseslint.config(...base, {
  files: ['**/*.{ts,tsx}'],
  plugins: { react, 'react-hooks': reactHooks },
  settings: { react: { version: 'detect' } },
  rules: {
    ...react.configs.recommended.rules,
    ...react.configs['jsx-runtime'].rules,
    ...reactHooks.configs.recommended.rules,
    'react/prop-types': 'off',
    'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }],
  },
});

export default reactNative;
