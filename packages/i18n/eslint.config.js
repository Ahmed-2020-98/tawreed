import { base } from '@tawreed/eslint-config/base';

export default [...base, { ignores: ['dist/**', 'tsup.config.ts', 'eslint.config.js'] }];
