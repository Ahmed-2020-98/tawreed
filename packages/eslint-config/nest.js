import globals from 'globals';
import tseslint from 'typescript-eslint';
import { base } from './base.js';

export const nest = tseslint.config(...base, {
  languageOptions: { globals: { ...globals.node } },
  rules: {
    // Nest relies on classes/decorators with DI-only constructors.
    '@typescript-eslint/no-extraneous-class': 'off',
    '@typescript-eslint/consistent-type-imports': 'off',
  },
});

export default nest;
