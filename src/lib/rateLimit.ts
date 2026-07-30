interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface FailedLoginEntry {
  attempts: number;
  lockedUntil: number;
}

const store = new Map<string, RateLimitEntry>();
const failedLogins = new Map<string, FailedLoginEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetTime) {
      store.delete(key);
    }
  }
  for (const [key, entry] of failedLogins.entries()) {
    if (now > entry.lockedUntil) {
      failedLogins.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetTime };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetTime };
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes

export function isLockedOut(ip: string): boolean {
  const entry = failedLogins.get(ip);
  if (!entry) return false;
  return Date.now() < entry.lockedUntil;
}

export function recordFailedLogin(ip: string): { locked: boolean; remaining: number } {
  const now = Date.now();
  const entry = failedLogins.get(ip);

  if (!entry || (entry.lockedUntil > 0 && now > entry.lockedUntil)) {
    failedLogins.set(ip, { attempts: 1, lockedUntil: 0 });
    return { locked: false, remaining: MAX_FAILED_ATTEMPTS - 1 };
  }

  entry.attempts++;
  if (entry.attempts >= MAX_FAILED_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_DURATION;
    return { locked: true, remaining: 0 };
  }

  return { locked: false, remaining: MAX_FAILED_ATTEMPTS - entry.attempts };
}

export function clearFailedLogins(ip: string): void {
  failedLogins.delete(ip);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

export const RATE_LIMITS = {
  LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 },
  API_GENERAL: { limit: 60, windowMs: 60 * 1000 },
  UPLOAD: { limit: 10, windowMs: 60 * 1000 },
  SHARE_VIEW: { limit: 30, windowMs: 60 * 1000 },
} as const;
