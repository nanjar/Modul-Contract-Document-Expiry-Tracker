import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter | null = null;
  constructor(private readonly config: ConfigService) {}
  private getTransporter() {
    if (this.transporter) return this.transporter;
    const host = this.config.get<string>('SMTP_HOST'); const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    if (!host) return null;
    this.transporter = nodemailer.createTransport({ host, port, secure: this.config.get<string>('SMTP_SECURE') === 'true', auth: this.config.get<string>('SMTP_USER') ? { user: this.config.get<string>('SMTP_USER'), pass: this.config.get<string>('SMTP_PASSWORD') } : undefined });
    return this.transporter;
  }
  async sendExpiryReminder(input: { to: string; subject: string; documentTitle: string; expiryDate: Date; daysBefore: number }) {
    const transporter = this.getTransporter(); if (!transporter) throw new Error('SMTP is not configured');
    const from = this.config.get<string>('MAIL_FROM'); if (!from) throw new Error('MAIL_FROM is not configured');
    const date = input.expiryDate.toISOString().slice(0,10);
    await transporter.sendMail({ from, to: input.to, subject: input.subject, text: `Reminder: ${input.documentTitle} expires on ${date} (${input.daysBefore} days from now).`, html: `<p><strong>${input.documentTitle}</strong> expires on <strong>${date}</strong>.</p><p>This is your ${input.daysBefore}-day expiry reminder.</p>` });
    this.logger.log(`Expiry reminder sent to ${input.to}`);
  }
}
