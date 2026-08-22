import { Injectable, Logger } from '@nestjs/common';
import { NotificationMessage, NotificationProvider } from './notification.types';
import { ResendNotificationProvider } from './resend.provider';

@Injectable()
export class EmailNotificationProvider implements NotificationProvider {
  private readonly logger = new Logger(EmailNotificationProvider.name);

  constructor(private readonly resend: ResendNotificationProvider) {}

  async send(message: NotificationMessage): Promise<{ messageId?: string }> {
    const mode = process.env.NOTIFICATION_EMAIL_MODE ?? 'console';
    if (mode === 'resend') return this.resend.send(message);
    if (mode !== 'console') throw new Error(`Unsupported notification email mode: ${mode}`);
    this.logger.log(`Email notification simulated: to=${message.to} subject=${message.subject}`);
    this.logger.debug(message.text);
    return { messageId: `console-${Date.now()}` };
  }
}
