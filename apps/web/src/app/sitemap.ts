import type { BlogPostSummaryDto, CategoryDto, ProductCardDto, SupplierPublicDto } from '@tawreed/contracts';
import type { MetadataRoute } from 'next';
import { publicApi } from '@/lib/api';
import { SITE_URL } from '@/lib/config';

export const revalidate = 3600;

/** Bilingual sitemap: every URL lists its Arabic (/) and English (/en) alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const api = publicApi('ar');
  const [categories, products, posts, suppliers] = await Promise.all([
    api.get<CategoryDto[]>('/public/categories').catch(() => []),
    api.page<ProductCardDto>('/public/products', { query: { pageSize: 100 } }).then((p) => p.data).catch(() => []),
    api.page<BlogPostSummaryDto>('/public/blog', { query: { pageSize: 100 } }).then((p) => p.data).catch(() => []),
    api.raw<SupplierPublicDto[]>('GET', '/public/suppliers', { query: { pageSize: 100 } }).then((r) => r.data).catch(() => []),
  ]);
  const paths = [
    '',
    '/store',
    '/categories',
    '/deals',
    '/suppliers',
    '/sell',
    '/pay-later',
    '/about',
    '/contact',
    '/faq',
    '/blog',
    '/pages/terms',
    '/pages/privacy',
    '/pages/returns',
    ...categories.map((c) => `/c/${c.slug}`),
    ...products.map((p) => `/product/${p.slug}`),
    ...posts.map((p) => `/blog/${p.slug}`),
    ...suppliers.map((s) => `/suppliers/${s.slug}`),
  ];
  return paths.map((p) => ({
    url: `${SITE_URL}${p || '/'}`,
    changeFrequency: p.startsWith('/product') || p === '/deals' ? 'daily' : 'weekly',
    priority: p === '' ? 1 : p.startsWith('/product') || p.startsWith('/c/') ? 0.8 : 0.6,
    alternates: { languages: { ar: `${SITE_URL}${p || '/'}`, en: `${SITE_URL}/en${p}` } },
  }));
}
