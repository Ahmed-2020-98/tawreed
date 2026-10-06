import { nest } from '@tawreed/eslint-config/nest';

export default [
  ...nest,
  { ignores: ['dist/**', 'src/generated/**', 'prisma/migrations/**', 'eslint.config.js', 'storage/**', 'storage-test/**'] },
  {
    // HTTP-level tests and seed/dev scripts work with loosely typed JSON; seeds also back-date rows with raw SQL on fixed identifiers.
    files: ['test/**/*.ts', 'src/seed/**/*.ts', 'prisma/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'no-restricted-properties': 'off',
      'max-lines': 'off',
      'no-console': 'off',
    },
  },
];
