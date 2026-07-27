import { NextRequest, NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production. Generate with: openssl rand -base64 48');
  }
  console.warn('[SECURITY] JWT_SECRET not set — using development fallback. DO NOT use in production!');
}

const SECRET = new TextEncoder().encode(JWT_SECRET || 'dev-only-secret-not-for-production-use');

export interface JWTPayload {
  userId: string;
  username: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('vr-studio-360')
    .setAudience('admin-panel')
    .setExpirationTime('8h')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: 'vr-studio-360',
      audience: 'admin-panel',
    });
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  const token = req.cookies.get('admin-token')?.value;
  return token || null;
}

export async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const token = getTokenFromRequest(req);
  if (!token) return false;
  return (await verifyToken(token)) !== null;
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
}
