import { next } from '@tawreed/eslint-config/next';

// React + a11y rules (the Next preset without framework-specific rules that don't apply to a component library).
export default [...next, { ignores: ['eslint.config.js'] }, { rules: { '@next/next/no-img-element': 'off', '@next/next/no-html-link-for-pages': 'off' } }];
