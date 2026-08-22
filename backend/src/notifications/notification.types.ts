export interface NotificationMessage {
  to: string;
  subject: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationProvider {
  send(message: NotificationMessage): Promise<{ messageId?: string }>;
}
