import { Injectable, Logger } from '@nestjs/common';
import { type NotificationCategory, type NotificationChannel, type NotificationDto, notificationPrefsSchema, type NotificationPrefDto, type StaffPermission, staffRolePermissions, type StaffRole } from '@tawreed/contracts';
import { translate } from '@tawreed/i18n';
import type { z } from 'zod';
import { loc } from '../../common/i18n/localize.js';
import { pageMeta } from '../../common/http/presenters.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { MailService } from '../../infrastructure/mail/mail.service.js';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { PushService } from '../../infrastructure/push/push.service.js';
import { SmsService } from '../../infrastructure/sms/sms.service.js';
import { RealtimeService } from '../realtime/realtime.service.js';

export interface SendInput {
  userIds: string[];
  template: string;
  params?: Record<string, string | number>;
  category: NotificationCategory;
  data?: { screen?: string; id?: string; url?: string };
  channels?: NotificationChannel[];
}

const DEFAULT_CHANNELS: NotificationChannel[] = ['IN_APP', 'PUSH'];

/** Multi-channel notifications: in-app inbox (+ realtime), Expo push, SMS and email — honouring user preferences. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('Notifications');

  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
    private readonly sms: SmsService,
    private readonly mail: MailService,
    private readonly realtime: RealtimeService,
  ) {}

  async send(input: SendInput): Promise<void> {
    const userIds = [...new Set(input.userIds.filter(Boolean))];
    if (!userIds.length) return;
    const channels = input.channels ?? DEFAULT_CHANNELS;
    const [users, prefs] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: userIds }, status: 'ACTIVE' }, select: { id: true, locale: true, phone: true, email: true, pushTokens: { select: { token: true } } } }),
      this.prisma.notificationPreference.findMany({ where: { userId: { in: userIds }, category: input.category, enabled: false } }),
    ]);
    const muted = new Set(prefs.map((p) => `${p.userId}:${p.channel}`));
    const params = input.params ?? {};
    for (const u of users) {
      const t = (lang: 'ar' | 'en') => ({ title: translate(lang, `notifications.${input.template}.title`, params), body: translate(lang, `notifications.${input.template}.body`, params) });
      const ar = t('ar');
      const en = t('en');
      const mine = u.locale === 'en' ? en : ar;
      const n = await this.prisma.notification.create({
        data: { userId: u.id, category: input.category, type: input.template, titleAr: ar.title, titleEn: en.title, bodyAr: ar.body, bodyEn: en.body, data: (input.data ?? undefined) },
      });
      this.realtime.emit(`user:${u.id}`, 'notification', { id: n.id, title: mine.title, body: mine.body, data: input.data ?? null, category: input.category });
      const deliveries: Prisma.NotificationDeliveryCreateManyInput[] = [];
      if (channels.includes('PUSH') && !muted.has(`${u.id}:PUSH`) && u.pushTokens.length) {
        const res = await this.push.send(u.pushTokens.map((p) => p.token), { title: mine.title, body: mine.body, data: { ...(input.data ?? {}), notificationId: n.id } });
        if (res.invalidTokens.length) await this.prisma.pushToken.deleteMany({ where: { token: { in: res.invalidTokens } } });
        deliveries.push({ notificationId: n.id, userId: u.id, channel: 'PUSH', result: res.sent ? 'SENT' : 'FAILED', provider: 'expo' });
      }
      if (channels.includes('SMS') && !muted.has(`${u.id}:SMS`) && u.phone) {
        const r = await this.sms.send(u.phone, `${mine.title}: ${mine.body}`);
        deliveries.push({ notificationId: n.id, userId: u.id, channel: 'SMS', result: r.ok ? 'SENT' : 'FAILED', provider: r.provider, target: u.phone, error: r.error ?? null });
      }
      if (channels.includes('EMAIL') && !muted.has(`${u.id}:EMAIL`) && u.email) {
        const ok = await this.mail.send({ to: u.email, subject: mine.title, text: mine.body, html: this.emailHtml(mine.title, mine.body, u.locale === 'en' ? 'ltr' : 'rtl') });
        deliveries.push({ notificationId: n.id, userId: u.id, channel: 'EMAIL', result: ok ? 'SENT' : 'FAILED', provider: 'smtp', target: u.email });
      }
      if (deliveries.length) await this.prisma.notificationDelivery.createMany({ data: deliveries });
    }
  }

  private emailHtml(title: string, body: string, dir: 'rtl' | 'ltr'): string {
    return `<div dir="${dir}" style="font-family:Tahoma,Arial,sans-serif;background:#F4F6F8;padding:24px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:14px;padding:24px;border-top:4px solid #0A9B69"><h2 style="color:#0B2D5B;margin:0 0 12px">${title}</h2><p style="color:#3D4653;line-height:1.8">${body}</p><p style="color:#98A3B1;font-size:12px;margin-top:24px">توريد · Tawreed</p></div></div>`;
  }

  /* ---------------------------------------------------------------- recipients */

  async companyUsers(companyId: string, roles?: string[]): Promise<string[]> {
    const rows = await this.prisma.buyerMember.findMany({ where: { companyId, status: 'ACTIVE', ...(roles ? { role: { in: roles as never } } : {}) }, select: { userId: true } });
    return rows.map((r) => r.userId);
  }

  async supplierUsers(supplierId: string, roles?: string[]): Promise<string[]> {
    const rows = await this.prisma.supplierMember.findMany({ where: { supplierId, status: 'ACTIVE', ...(roles ? { role: { in: roles as never } } : {}) }, select: { userId: true } });
    return rows.map((r) => r.userId);
  }

  async driverUser(driverId: string | null): Promise<string[]> {
    if (!driverId) return [];
    const d = await this.prisma.driver.findUnique({ where: { id: driverId }, select: { userId: true } });
    return d ? [d.userId] : [];
  }

  async staffWith(permission: StaffPermission): Promise<string[]> {
    const roles = (Object.entries(staffRolePermissions) as [StaffRole, readonly StaffPermission[]][]).filter(([, perms]) => perms.includes(permission)).map(([r]) => r);
    const rows = await this.prisma.user.findMany({ where: { type: 'STAFF', status: 'ACTIVE', staffRoles: { hasSome: roles } }, select: { id: true } });
    return rows.map((r) => r.id);
  }

  /* ---------------------------------------------------------------- inbox */

  toDto(n: Prisma.NotificationGetPayload<object>): NotificationDto {
    return { id: n.id, category: n.category, type: n.type, title: loc(n.titleAr, n.titleEn), body: loc(n.bodyAr, n.bodyEn), data: (n.data ?? null) as NotificationDto['data'], readAt: n.readAt?.toISOString() ?? null, createdAt: n.createdAt.toISOString() };
  }

  async list(userId: string, page: number, pageSize: number, unreadOnly: boolean) {
    const where: Prisma.NotificationWhereInput = { userId, ...(unreadOnly ? { readAt: null } : {}) };
    const [total, rows, unread] = await Promise.all([
      this.prisma.notification.count({ where }),
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { data: rows.map((n) => this.toDto(n)), meta: { ...pageMeta(page, pageSize, total), unread } };
  }

  unreadCount(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } }).then((count) => ({ count }));
  }

  async markRead(userId: string, id?: string) {
    await this.prisma.notification.updateMany({ where: { userId, readAt: null, ...(id ? { id } : {}) }, data: { readAt: new Date() } });
    return this.unreadCount(userId);
  }

  async registerDevice(userId: string, token: string, platform: string, app: string) {
    await this.prisma.pushToken.upsert({ where: { token }, create: { userId, token, platform, app: app as never }, update: { userId, platform, app: app as never, lastSeenAt: new Date() } });
    return { ok: true };
  }

  async removeDevice(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
    return { ok: true };
  }

  async prefs(userId: string): Promise<NotificationPrefDto[]> {
    const rows = await this.prisma.notificationPreference.findMany({ where: { userId } });
    const channels: NotificationChannel[] = ['PUSH', 'SMS', 'EMAIL'];
    const categories: NotificationCategory[] = ['ORDERS', 'PAYMENTS', 'RFQ', 'DELIVERY', 'PROMOTIONS', 'ACCOUNT'];
    return categories.flatMap((category) => channels.map((channel) => ({ channel, category, enabled: rows.find((r) => r.channel === channel && r.category === category)?.enabled ?? true })));
  }

  async savePrefs(userId: string, input: z.output<typeof notificationPrefsSchema>) {
    for (const i of input.items) {
      await this.prisma.notificationPreference.upsert({ where: { userId_channel_category: { userId, channel: i.channel, category: i.category } }, create: { userId, ...i }, update: { enabled: i.enabled } });
    }
    return this.prefs(userId);
  }

  async deliveryLog(page: number, pageSize: number) {
    const [total, rows] = await Promise.all([this.prisma.notificationDelivery.count(), this.prisma.notificationDelivery.findMany({ orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { notification: { select: { titleAr: true, type: true } } } })]);
    this.logger.debug(`delivery log page ${page}`);
    return { data: rows.map((r) => ({ id: r.id, channel: r.channel, result: r.result, provider: r.provider, target: r.target, error: r.error, title: r.notification?.titleAr ?? null, type: r.notification?.type ?? null, createdAt: r.createdAt.toISOString() })), meta: pageMeta(page, pageSize, total) };
  }
}
