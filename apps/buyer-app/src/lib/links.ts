import type { BannerDto } from '@tawreed/contracts';

/** In-app route for a CMS banner link. */
export function bannerRoute(b: BannerDto): string {
  const v = b.link.value ?? '';
  switch (b.link.type) {
    case 'CATEGORY':
      return `/c/${v}`;
    case 'PRODUCT':
      return `/product/${v}`;
    case 'DEALS':
      return '/c/deals';
    case 'RFQ':
      return '/rfq/new';
    default:
      return '/categories';
  }
}
