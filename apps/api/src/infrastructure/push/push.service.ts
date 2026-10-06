import { Injectable, Logger } from '@nestjs/common';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { AppConfig } from '../../config/app-config.js';

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  badge?: number;
}

/** Expo push notifications. Returns tokens reported as unregistered so callers can prune them. */
@Injectable()
export class PushService {
  private readonly logger = new Logger('Push');
  private readonly expo: Expo;

  constructor(config: AppConfig) {
    this.expo = new Expo({ accessToken: config.env.EXPO_ACCESS_TOKEN || undefined });
  }

  async send(tokens: string[], payload: PushPayload): Promise<{ sent: number; invalidTokens: string[] }> {
    const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
    const invalidTokens: string[] = tokens.filter((t) => !Expo.isExpoPushToken(t));
    const messages: ExpoPushMessage[] = valid.map((to) => ({ to, sound: 'default', ...payload }));
    let sent = 0;
    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      try {
        const tickets = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket, i) => {
          if (ticket.status === 'ok') sent++;
          else if (ticket.details?.error === 'DeviceNotRegistered') {
            const to = chunk[i]?.to;
            if (typeof to === 'string') invalidTokens.push(to);
          }
        });
      } catch (err) {
        this.logger.warn(`Expo push failed: ${(err as Error).message}`);
      }
    }
    return { sent, invalidTokens };
  }
}
