import type { CityRef, PageMeta } from '@tawreed/contracts';

export function cityRef(c: { id: string; slug: string; nameAr: string; nameEn: string } | null | undefined): CityRef | null {
  return c ? { id: c.id, slug: c.slug, name: { ar: c.nameAr, en: c.nameEn } } : null;
}

export const citySelect = { id: true, slug: true, nameAr: true, nameEn: true } as const;

export function pageMeta(page: number, pageSize: number, total: number): PageMeta {
  return { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export const iso = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);
