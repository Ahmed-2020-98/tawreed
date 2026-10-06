import { Injectable } from '@nestjs/common';
import type { CityDto, RegionDto } from '@tawreed/contracts';
import { loc } from '../../common/i18n/localize.js';
import type { City, Region } from '../../generated/prisma/client.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';

type CityWithRegion = City & { region: Region };

@Injectable()
export class GeoService {
  private cache: { at: number; cities: CityWithRegion[] } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async cities(): Promise<CityWithRegion[]> {
    if (this.cache && Date.now() - this.cache.at < 300_000) return this.cache.cities;
    const cities = await this.prisma.city.findMany({ where: { isActive: true }, include: { region: true }, orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }] });
    this.cache = { at: Date.now(), cities };
    return cities;
  }

  toDto(c: CityWithRegion): CityDto {
    return { id: c.id, slug: c.slug, name: loc(c.nameAr, c.nameEn), names: { ar: c.nameAr, en: c.nameEn }, region: loc(c.region.nameAr, c.region.nameEn), lat: c.lat, lng: c.lng };
  }

  async list(): Promise<CityDto[]> {
    return (await this.cities()).map((c) => this.toDto(c));
  }

  async regions(): Promise<RegionDto[]> {
    const cities = await this.cities();
    const map = new Map<string, RegionDto>();
    for (const c of cities) {
      const r = map.get(c.regionId) ?? { id: c.region.id, code: c.region.code, name: loc(c.region.nameAr, c.region.nameEn), cities: [] };
      r.cities.push(this.toDto(c));
      map.set(c.regionId, r);
    }
    return [...map.values()];
  }

  /** Accepts a city id or slug. */
  async resolve(idOrSlug: string | null | undefined): Promise<CityWithRegion | null> {
    if (!idOrSlug) return null;
    const cities = await this.cities();
    return cities.find((c) => c.id === idOrSlug || c.slug === idOrSlug) ?? null;
  }
}
