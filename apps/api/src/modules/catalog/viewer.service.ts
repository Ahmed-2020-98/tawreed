import { Injectable } from '@nestjs/common';
import type { Actor } from '../../common/context/request-context.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { GeoService } from '../geo/geo.service.js';
import { SettingsService } from '../settings/settings.service.js';

export interface Viewer {
  cityId: string | null;
  citySlug: string | null;
  userId: string | null;
  companyId: string | null;
  isBuyer: boolean;
}

/** Resolves who is browsing and for which delivery city (drives coverage, fees and buy-box). */
@Injectable()
export class ViewerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly settings: SettingsService,
  ) {}

  async resolve(actor: Actor | undefined, city?: string | null): Promise<Viewer> {
    const isBuyer = actor?.contextType === 'BUYER';
    let resolved = await this.geo.resolve(city);
    if (!resolved && isBuyer && actor.contextId) {
      const address = await this.prisma.buyerAddress.findFirst({
        where: { companyId: actor.contextId, deletedAt: null },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        select: { cityId: true },
      });
      const company = address ? null : await this.prisma.buyerCompany.findUnique({ where: { id: actor.contextId }, select: { cityId: true } });
      resolved = await this.geo.resolve(address?.cityId ?? company?.cityId ?? null);
    }
    if (!resolved) resolved = await this.geo.resolve((await this.settings.get('delivery')).defaultCitySlug);
    return {
      cityId: resolved?.id ?? null,
      citySlug: resolved?.slug ?? null,
      userId: actor?.userId ?? null,
      companyId: isBuyer ? actor.contextId : null,
      isBuyer,
    };
  }

  async favorites(viewer: Viewer, productIds: string[]): Promise<Set<string>> {
    if (!viewer.userId || !viewer.isBuyer || !productIds.length) return new Set();
    const rows = await this.prisma.favorite.findMany({ where: { userId: viewer.userId, productId: { in: productIds } }, select: { productId: true } });
    return new Set(rows.map((r) => r.productId));
  }
}
