import { Injectable } from '@nestjs/common';
import type { PublicSettingsDto } from '@tawreed/contracts';
import { loc } from '../../common/i18n/localize.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { AuditService } from '../../infrastructure/audit/audit.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { SETTINGS_DEFAULTS, type SettingsKey, type SettingsShape } from './settings.defaults.js';

/** Platform settings (key → JSON) with defaults and a short in-process cache. */
@Injectable()
export class SettingsService {
  private cache: { at: number; values: Partial<SettingsShape> } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async all(): Promise<Partial<SettingsShape>> {
    if (this.cache && Date.now() - this.cache.at < 30_000) return this.cache.values;
    const rows = await this.prisma.platformSetting.findMany();
    const values = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<SettingsShape>;
    this.cache = { at: Date.now(), values };
    return values;
  }

  async get<K extends SettingsKey>(key: K): Promise<SettingsShape[K]> {
    const values = await this.all();
    return { ...SETTINGS_DEFAULTS[key], ...(values[key] as object | undefined) };
  }

  async getAll(): Promise<SettingsShape> {
    const values = await this.all();
    const out = {} as Record<string, unknown>;
    for (const key of Object.keys(SETTINGS_DEFAULTS) as SettingsKey[]) {
      out[key] = { ...SETTINGS_DEFAULTS[key], ...(values[key] as object | undefined) };
    }
    return out as SettingsShape;
  }

  async set<K extends SettingsKey>(key: K, value: Partial<SettingsShape[K]>, actorId?: string): Promise<SettingsShape[K]> {
    const before = await this.get(key);
    const merged = { ...before, ...value };
    await this.prisma.platformSetting.upsert({
      where: { key },
      create: { key, value: merged as Prisma.InputJsonValue, updatedById: actorId ?? null },
      update: { value: merged as Prisma.InputJsonValue, updatedById: actorId ?? null },
    });
    await this.audit.record(this.prisma, { action: 'settings.updated', entityType: 'PlatformSetting', entityId: key, before, after: merged });
    this.cache = null;
    return merged;
  }

  async publicSettings(): Promise<PublicSettingsDto> {
    const s = await this.getAll();
    return {
      platformName: loc(s.platform.name, s.platform.nameEn),
      legalName: loc(s.platform.legalName, s.platform.legalNameEn),
      vatNumber: s.platform.vatNumber,
      crNumber: s.platform.crNumber,
      address: loc(s.platform.address, s.platform.addressEn),
      supportPhone: s.support.phone,
      supportWhatsapp: s.support.whatsapp,
      supportEmail: s.support.email,
      appLinks: s.appLinks,
      social: s.social,
      paymentMethods: s.payments.enabledMethods,
      bankAccounts: s.payments.bankAccounts,
      hidePricesForGuests: s.payments.hidePricesForGuests,
      defaultCitySlug: s.delivery.defaultCitySlug,
      vatRate: s.tax.vatRate,
    };
  }
}
