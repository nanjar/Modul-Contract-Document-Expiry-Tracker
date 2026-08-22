import { Injectable } from '@nestjs/common';
import { NotificationMessage, NotificationProvider } from './notification.types';

@Injectable()
export class ResendNotificationProvider implements NotificationProvider {
  async send(message: NotificationMessage): Promise<{ messageId?: string }> {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.NOTIFICATION_FROM_EMAIL;

    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
    if (!from) throw new Error('NOTIFICATION_FROM_EMAIL is not configured');

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text }),
    });

    const payload = (await response.json()) as { id?: string; message?: string };
    if (!response.ok) {
      throw new Error(payload.message ?? `Resend request failed with status ${response.status}`);
    }

    return { messageId: payload.id };
  }
}
