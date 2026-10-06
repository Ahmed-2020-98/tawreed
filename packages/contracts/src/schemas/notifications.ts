import { z } from 'zod';
import { AppClient, NotificationCategory, type NotificationCategory as NotificationCategoryT, NotificationChannel, type NotificationChannel as NotificationChannelT } from '../enums.js';
import { paginationQuery } from '../common.js';

export interface NotificationDto {
  id: string;
  category: NotificationCategoryT;
  type: string;
  title: string;
  body: string;
  data: { screen?: string; id?: string; url?: string } | null;
  readAt: string | null;
  createdAt: string;
}

export const notificationQuery = paginationQuery.extend({ unread: z.enum(['true', 'false']).optional() });
export const registerDeviceSchema = z.object({ token: z.string().min(10).max(300), platform: z.enum(['ios', 'android', 'web']), app: z.enum(AppClient) });
export const notificationPrefsSchema = z.object({
  items: z.array(z.object({ channel: z.enum(NotificationChannel), category: z.enum(NotificationCategory), enabled: z.boolean() })).max(40),
});

export interface NotificationPrefDto {
  channel: NotificationChannelT;
  category: NotificationCategoryT;
  enabled: boolean;
}
