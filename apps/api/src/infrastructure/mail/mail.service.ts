import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppConfig } from '../../config/app-config.js';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  private readonly transport: Transporter;

  constructor(private readonly config: AppConfig) {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = config.env;
    this.transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  }

  async send(message: MailMessage): Promise<boolean> {
    if (!this.config.env.SMTP_HOST || this.config.env.SMTP_HOST === 'none') {
      this.logger.log(`Email to ${message.to} skipped (no SMTP_HOST): ${message.subject}`);
      return false;
    }
    try {
      await this.transport.sendMail({ from: this.config.env.MAIL_FROM, ...message });
      return true;
    } catch (err) {
      this.logger.warn(`Email to ${message.to} failed: ${(err as Error).message}`);
      return false;
    }
  }
}
