import { PUBLIC_MEDIA_BASE } from './config';

/** Public seed image by manifest key (e.g. "hero-market"), variant md|thumb|full. */
export const seedImage = (key: string, variant: 'md' | 'thumb' | 'full' = 'md') => `${PUBLIC_MEDIA_BASE}/seed/${key}${variant === 'full' ? '' : `_${variant}`}.webp`;
