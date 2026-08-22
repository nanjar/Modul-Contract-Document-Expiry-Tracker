import { CanActivate, ExecutionContext, Injectable, TooManyRequestsException } from '@nestjs/common';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const email = typeof request.body?.email === 'string' ? request.body.email.toLowerCase().trim() : '';
    const ip = request.ip ?? request.socket?.remoteAddress ?? 'unknown';
    const key = `${ip}:${email}`;
    const now = Date.now();
    const current = this.attempts.get(key);

    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return true;
    }

    if (current.count >= MAX_ATTEMPTS) {
      throw new TooManyRequestsException('Too many login attempts. Try again later.');
    }

    current.count += 1;
    return true;
  }
}
