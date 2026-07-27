import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signToken } from '@/lib/auth';
import { rateLimit, getClientIp, RATE_LIMITS, isLockedOut, recordFailedLogin, clearFailedLogins } from '@/lib/rateLimit';
import { loginSchema } from '@/lib/validation';
import { auditLog } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // Check lockout first
  if (isLockedOut(ip)) {
    return NextResponse.json(
      { error: 'Аккаунт заблокирован из-за множественных попыток входа. Попробуйте через 15 минут.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    );
  }

  const { allowed, remaining } = rateLimit(
    `login:${ip}`,
    RATE_LIMITS.LOGIN.limit,
    RATE_LIMITS.LOGIN.windowMs
  );

  if (!allowed) {
    return NextResponse.json(
      { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' },
      { status: 429, headers: { 'Retry-After': '900' } }
    );
  }

  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 });
    }

    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      const { locked, remaining: attemptsLeft } = recordFailedLogin(ip);
      return NextResponse.json(
        { error: locked ? 'Слишком много неудачных попыток. Аккаунт заблокирован на 15 минут.' : `Неверный логин или пароль. Осталось попыток: ${attemptsLeft}` },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      const { locked, remaining: attemptsLeft } = recordFailedLogin(ip);
      return NextResponse.json(
        { error: locked ? 'Слишком много неудачных попыток. Аккаунт заблокирован на 15 минут.' : `Неверный логин или пароль. Осталось попыток: ${attemptsLeft}` },
        { status: 401 }
      );
    }

    // Clear failed login attempts on success
    clearFailedLogins(ip);

    const token = await signToken({ userId: user.id, username: user.username });

    await auditLog({
      userId: user.id,
      action: 'login',
      ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    const response = NextResponse.json({ success: true });
    response.cookies.set('admin-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
