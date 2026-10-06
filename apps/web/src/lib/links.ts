import type { BannerDto } from '@tawreed/contracts';

/** In-app href for a CMS banner link. */
export function bannerHref(b: BannerDto): string {
  const v = b.link.value ?? '';
  switch (b.link.type) {
    case 'CATEGORY':
      return `/c/${v}`;
    case 'PRODUCT':
      return `/product/${v}`;
    case 'SUPPLIER':
      return `/suppliers/${v}`;
    case 'BRAND':
      return `/brands/${v}`;
    case 'DEALS':
      return '/deals';
    case 'RFQ':
      return '/rfq/new';
    case 'URL':
      return v || '/store';
    default:
      return v.startsWith('/') ? v : '/store';
  }
}
