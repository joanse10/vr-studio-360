# ТЗ Enterprise: Безопасность и Production-готовность
## VR Studio 360 — Платформа 360° визуализации интерьеров

**Версия:** 1.0.0  
**Дата:** 2026-07-27  
**Статус:** Enterprise Specification  

---

## Оглавление

1. [Аудит текущего состояния](#1-аудит-текущего-состояния)
2. [Аутентификация и авторизация](#2-аутентификация-и-авторизация)
3. [Защита API маршрутов](#3-защита-api-маршрутов)
4. [Rate Limiting и защита от брутфорса](#4-rate-limiting-и-защита-от-брутфорса)
5. [Безопасность загрузки файлов](#5-безопасность-загрузки-файлов)
6. [Защита данных и приватность](#6-защита-данных-и-приватность)
7. [Security Headers и CSP](#7-security-headers-и-csp)
8. [Валидация входных данных](#8-валидация-входных-данных)
9. [Infrastructure & Deployment](#9-infrastructure--deployment)
10. [Мониторинг и логирование](#10-мониторинг-и-логирование)
11. [Backup и восстановление](#11-backup-и-восстановление)
12. [Compliance и GDPR](#12-compliance-и-gdpr)
13. [Чек-лист внедрения](#13-чек-лист-внедрения)

---

## 1. Аудит текущего состояния

### Критические уязвимости (P0)

| # | Уязвимость | Файл | Риск |
|---|-----------|------|------|
| 1 | JWT secret — хардкод fallback | `src/lib/auth.ts:4` | Если `JWT_SECRET` не задан, используется дефолтный секрет — полный обход аутентификации |
| 2 | Middleware не верифицирует JWT | `src/middleware.ts:11` | Проверяется только наличие cookie, не валидность токена — любой может создать фейковый `admin-token` |
| 3 | `/admin/clients` не защищён middleware | `src/middleware.ts:3` | `ADMIN_PATHS` не включает `/admin/clients` — доступ без авторизации |
| 4 | SQLite в production | `prisma/schema.prisma:6` | Не подходит для concurrent-нагрузки, нет репликации |
| 5 | Дефолтные креды admin/admin123 | `.env:8-9` | Known-credentials в seed скрипте |
| 6 | File extension from user input | `src/app/api/admin/upload/route.ts:31` | `file.name.split('.').pop()` — path traversal через двойное расширение |
| 7 | Нет rate limiting | Все API routes | Brute-force, DoS, abuse |
| 8 | Нет валидации входных данных | Все API routes | SQL injection (Prisma защищает), но XSS через сохранённые данные |
| 9 | `remotePatterns: '**'` для всех хостов | `next.config.js:8` | SSRF — любой хост может быть использован для загрузки изображений |
| 10 | Нет security headers | `next.config.js` | Отсутствуют CSP, X-Frame-Options, X-Content-Type-Options |

### Высокий риск (P1)

| # | Уязвимость | Описание |
|---|-----------|----------|
| 11 | Cookie `sameSite: 'lax'` | Рекомендуется `strict` для admin-cookie |
| 12 | JWT expiry 7 дней без refresh | Нет механизма отзыва токенов |
| 13 | Нет audit log | Все действия администратора не логируются |
| 14 | Нет HTTPS enforcement | Middleware не редиректит на HTTPS |
| 15 | Публичный API `/api/collections` | Отдаёт все публичные коллекции без пагинации |

---

## 2. Аутентификация и авторизация

### 2.1. JWT Security Hardening

**Файл:** `src/lib/auth.ts`

```typescript
// Текущая уязвимость:
const JWT_SECRET = process.env.JWT_SECRET || 'vr-studio-360-secret-change-in-production';

// Требуется:
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters in production');
}

// Опции токена:
const JWT_OPTIONS = {
  expiresIn: '8h',           // сокращить с 7 дней до 8 часов
  issuer: 'vr-studio-360',
  audience: 'admin-panel',
  algorithm: 'HS256' as const,
};
```

### 2.2. Middleware: JWT Verification

**Файл:** `src/middleware.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const ADMIN_PATHS = [
  '/admin/dashboard',
  '/admin/collections',
  '/admin/clients',  // добавить отсутствующий путь
];

const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/collections',
];

function verifyJwt(token: string): boolean {
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return false;
    jwt.verify(token, secret, { issuer: 'vr-studio-360', audience: 'admin-panel' });
    return true;
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Защита admin страниц
  const isAdminPath = ADMIN_PATHS.some((p) => pathname.startsWith(p));
  if (isAdminPath) {
    const token = req.cookies.get('admin-token')?.value;
    if (!token || !verifyJwt(token)) {
      const loginUrl = new URL('/admin/login', req.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('admin-token');
      return response;
    }
  }

  // Защита admin API routes
  const isAdminApi = pathname.startsWith('/api/admin');
  if (isAdminApi) {
    const token = req.cookies.get('admin-token')?.value;
    if (!token || !verifyJwt(token)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
  ],
};
```

### 2.3. Cookie Hardening

**Файл:** `src/app/api/auth/login/route.ts`

```typescript
response.cookies.set('admin-token', token, {
  httpOnly: true,
  secure: true,                    // всегда true в production
  sameSite: 'strict',              // усилить с 'lax' до 'strict'
  maxAge: 60 * 60 * 8,             // 8 часов вместо 7 дней
  path: '/',
  domain: process.env.COOKIE_DOMAIN || undefined,
});
```

### 2.4. Password Policy

```typescript
// Минимальные требования к паролю:
// - Минимум 12 символов
// - Минимум 1 заглавная буква
// - Минимум 1 цифра
// - Минимум 1 спецсимвол
// - bcrypt rounds: 12 (вместо дефолтных 10)

const BCRYPT_ROUNDS = 12;

function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 12) errors.push('Минимум 12 символов');
  if (!/[A-Z]/.test(password)) errors.push('Нужна заглавная буква');
  if (!/[0-9]/.test(password)) errors.push('Нужна цифра');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Нужен спецсимвол');
  return { valid: errors.length === 0, errors };
}
```

### 2.5. Session Management

- [ ] **Token rotation**: При каждом запросе к admin API — обновлять токен (sliding session)
- [ ] **Token revocation**: Redis-стор для blacklist отозванных токенов
- [ ] **Concurrent session limit**: Максимум 2 одновременные сессии администратора
- [ ] **Idle timeout**: Автоматический logout после 30 минут неактивности
- [ ] **Failed login lockout**: Блокировка после 5 неудачных попыток на 15 минут

---

## 3. Защита API маршрутов

### 3.1. Все admin API routes

Каждый API маршрут должен:

```typescript
// Паттерн для всех /api/admin/* routes:
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function GET(req: NextRequest) {
  // 1. Проверка авторизации
  if (!isAuthenticated(req)) return unauthorizedResponse();

  // 2. Валидация входных данных
  // 3. Rate limiting check
  // 4. Audit log
  // 5. Business logic
}
```

### 3.2. Публичные API

```typescript
// /api/collections — добавить пагинацию
// GET /api/collections?page=1&limit=12
// Максимум 50 элементов на страницу
// Rate limit: 60 запросов/минута на IP
```

### 3.3. Share token API

```typescript
// /share/[token] — добавить:
// - Проверка expiry даты share link
// - Логирование просмотра (viewedAt)
// - Rate limit: 30 запросов/минута на IP
// - IP whitelist опционально
```

---

## 4. Rate Limiting и защита от брутфорса

### 4.1. In-memory Rate Limiter

**Новый файл:** `src/lib/rateLimit.ts`

```typescript
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

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

// Конфигурация:
export const RATE_LIMITS = {
  LOGIN: { limit: 5, windowMs: 15 * 60 * 1000 },      // 5 попыток / 15 минут
  API_GENERAL: { limit: 60, windowMs: 60 * 1000 },     // 60 запросов / минута
  UPLOAD: { limit: 10, windowMs: 60 * 1000 },           // 10 загрузок / минута
  SHARE_VIEW: { limit: 30, windowMs: 60 * 1000 },       // 30 просмотров / минута
};
```

### 4.2. Применение в login route

```typescript
import { rateLimit, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { allowed, remaining } = rateLimit(
    `login:${ip}`,
    RATE_LIMITS.LOGIN.limit,
    RATE_LIMITS.LOGIN.windowMs
  );

  if (!allowed) {
    return NextResponse.json(
      { error: 'Слишком много попыток. Попробуйте через 15 минут.' },
      {
        status: 429,
        headers: { 'Retry-After': '900' }
      }
    );
  }
  // ... остальная логика
}
```

### 4.3. Для production: Redis-based rate limiter

```typescript
// При использовании Redis (рекомендуется для multi-instance):
// import { Redis } from 'ioredis';
// const redis = new Redis(process.env.REDIS_URL);
//
// async function rateLimitRedis(key, limit, windowMs) {
//   const multi = redis.multi();
//   multi.incr(key);
//   multi.expire(key, Math.ceil(windowMs / 1000));
//   const results = await multi.exec();
//   const count = results[0][1] as number;
//   return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
// }
```

---

## 5. Безопасность загрузки файлов

### 5.1. Текущие уязвимости

```typescript
// УЯЗВИМО: extension from filename
const ext = file.name.split('.').pop() || 'jpg';
const filename = `${uuidv4()}.${ext}`;
```

### 5.2. Требуемая реализация

**Файл:** `src/app/api/admin/upload/route.ts`

```typescript
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const ALLOWED_UPLOAD_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

// Magic bytes для верификации типа файла
const FILE_SIGNATURES: Record<string, number[]> = {
  jpg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF
};

function verifyFileSignature(buffer: Buffer, ext: string): boolean {
  const signature = FILE_SIGNATURES[ext];
  if (!signature) return false;
  return signature.every((byte, i) => buffer[i] === byte);
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  // Rate limit
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const { allowed } = rateLimit(`upload:${ip}`, RATE_LIMITS.UPLOAD.limit, RATE_LIMITS.UPLOAD.windowMs);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'Файл не загружен' }, { status: 400 });
  }

  // 1. Проверка MIME типа
  const ext = ALLOWED_MIME_TYPES[file.type];
  if (!ext) {
    return NextResponse.json({ error: 'Неподдерживаемый формат' }, { status: 400 });
  }

  // 2. Проверка размера
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'Файл слишком большой (макс 50MB)' }, { status: 400 });
  }

  // 3. Чтение и верификация magic bytes
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  if (!verifyFileSignature(buffer, ext)) {
    return NextResponse.json({ error: 'Файл повреждён или подделан' }, { status: 400 });
  }

  // 4. Безопасное имя файла (UUID + verified extension)
  const filename = `${crypto.randomUUID()}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  // 5. Path traversal protection
  const resolvedPath = path.resolve(filepath);
  const resolvedDir = path.resolve(UPLOAD_DIR);
  if (!resolvedPath.startsWith(resolvedDir + path.sep)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  // 6. Запись файла
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(resolvedPath, buffer);

  // 7. Audit log
  console.log(`[UPLOAD] ${new Date().toISOString()} | file=${filename} | size=${file.size} | type=${file.type}`);

  return NextResponse.json({ url: `/uploads/${filename}`, filename, type: ext });
}
```

### 5.3. Дополнительные меры

- [ ] **Antivirus сканирование**: ClamAV для загружаемых файлов
- [ ] **Image re-encoding**: Re-save через sharp для удаления метаданных и embedded payloads
- [ ] **CDN с WAF**: Cloudflare/Fastly для фильтрации загрузок
- [ ] **Quota**: Лимит дискового пространства на коллекцию (например, 2GB)

---

## 6. Защита данных и приватность

### 6.1. Database Migration: SQLite → PostgreSQL

**Файл:** `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Преимущества PostgreSQL для enterprise:**
- Concurrent connections (connection pooling через PgBouncer)
- Row-level security
- Streaming replication
- Point-in-time recovery
- JSONB для сложных метаданных
- Full-text search

### 6.2. Шифрование чувствительных данных

```typescript
// Email клиента — шифровать в БД (AES-256-GCM)
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes, base64

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'base64'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(ENCRYPTION_KEY, 'base64'),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 6.3. Data Retention Policy

| Тип данных | Срок хранения | Действие |
|-----------|--------------|----------|
| Audit logs | 2 года | Автоматическое удаление |
| Client access tokens | До истечения expiry | Auto-cleanup cron |
| Upload files | Бессрочно (пока коллекция активна) | Удаление при удалении коллекции |
| Session data | 8 часов | Auto-expire |
| Failed login logs | 90 дней | Auto-cleanup |

---

## 7. Security Headers и CSP

### 7.1. Next.js Security Headers

**Файл:** `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Ограничить только доверенными хостами
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "media-src 'self' https:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
      {
        // Отдельные заголовки для uploads (без execute)
        source: '/uploads/(.*)',
        headers: [
          { key: 'Content-Disposition', value: 'attachment' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
        ],
      },
    ];
  },

  experimental: {
    optimizePackageImports: ['framer-motion'],
  },

  // Production optimizations
  poweredByHeader: false,
  compress: true,
};

module.exports = nextConfig;
```

### 7.2. CSP для Pannellum

Pannellum загружается с CDN — требуется добавить в CSP:
```
script-src: https://cdn.jsdelivr.net
style-src: https://cdn.jsdelivr.net
img-src: blob: data: https:
```

---

## 8. Валидация входных данных

### 8.1. Validation Library

Установить `zod` для schema validation:

```bash
npm install zod
```

### 8.2. Schemas

**Новый файл:** `src/lib/validation.ts`

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(1).max(100),
});

export const createCollectionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  status: z.enum(['public', 'private', 'closed']).default('private'),
  coverImage: z.string().url().optional().or(z.literal('')),
});

export const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  panoramaUrl: z.string().min(1).max(2000),
  initialYaw: z.number().min(-180).max(180).default(0),
  initialPitch: z.number().min(-90).max(90).default(0),
  initialHfov: z.number().min(30).max(150).default(100),
});

export const createClientSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  collectionId: z.string().uuid().optional(),
});

export const hotspotSchema = z.object({
  toRoomId: z.string().uuid(),
  yaw: z.number().min(-180).max(180),
  pitch: z.number().min(-90).max(90),
  label: z.string().max(100).default('Перейти'),
});

export const shareLinkSchema = z.object({
  label: z.string().max(100).default(''),
  expiresAt: z.string().datetime().optional(),
});
```

### 8.3. Применение в API routes

```typescript
import { createCollectionSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  const body = await req.json();
  const parsed = createCollectionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Использовать parsed.data (типобезопасные данные)
  const collection = await prisma.collection.create({
    data: parsed.data,
  });
  // ...
}
```

### 8.4. XSS Prevention

```typescript
// Санитизация HTML в описаниях и заголовках
// Установить: npm install dompurify
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

// Применять ко всем текстовым полям перед сохранением в БД
```

---

## 9. Infrastructure & Deployment

### 9.1. Environment Variables

**Файл:** `.env.example`

```bash
# === Database ===
DATABASE_URL="postgresql://user:password@localhost:5432/vr_studio_360?schema=public"

# === Auth ===
JWT_SECRET=""  # Минимум 32 символа, сгенерировать: openssl rand -base64 48
ENCRYPTION_KEY=""  # 32 bytes base64, сгенерировать: openssl rand -base64 32

# === Admin ===
ADMIN_USERNAME="admin"
ADMIN_PASSWORD=""  # Минимум 12 символов, сложный пароль

# === App ===
NEXT_PUBLIC_BASE_URL="https://your-domain.com"
NODE_ENV="production"

# === Cookie ===
COOKIE_DOMAIN="your-domain.com"

# === Redis (для rate limiting и sessions) ===
REDIS_URL="redis://localhost:6379"

# === Upload ===
UPLOAD_DIR="/var/www/vr-studio-360/uploads"
MAX_UPLOAD_SIZE_MB="50"

# === Optional: CDN ===
CDN_BASE_URL="https://cdn.your-domain.com"

# === Optional: Sentry ===
SENTRY_DSN=""
```

### 9.2. Docker Setup

**Новый файл:** `Dockerfile`

```dockerfile
FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --production=false

# --- Build ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Production ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Uploads directory
RUN mkdir -p /app/public/uploads && chown nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Новый файл:** `docker-compose.yml`

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    volumes:
      - uploads:/app/public/uploads

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: vr_studio_360
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  uploads:
  postgres_data:
  redis_data:
```

### 9.3. next.config.js — standalone output

```javascript
const nextConfig = {
  output: 'standalone',  // минимальный production bundle
  // ... остальные опции
};
```

### 9.4. Reverse Proxy (Nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Upload size limit
    client_max_body_size 50M;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=60r/m;

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:3000;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Запрет выполнения скриптов в uploads
    location /uploads/ {
        alias /var/www/vr-studio-360/uploads/;
        add_header Content-Disposition "attachment";
        add_header X-Content-Type-Options "nosniff";
        location ~* \.(js|html|svg)$ {
            deny all;
        }
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 10. Мониторинг и логирование

### 10.1. Audit Log

**Новая модель Prisma:**

```prisma
model AuditLog {
  id        String   @id @default(uuid())
  userId    String?
  action    String   // login, logout, collection.create, collection.delete, etc.
  entity    String?  // collection, room, client, share_link
  entityId  String?
  ip        String?
  userAgent String?
  metadata  String?  // JSON string
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([action])
  @@index([createdAt])
}
```

**Новый файл:** `src/lib/audit.ts`

```typescript
import { prisma } from './prisma';

export async function auditLog(params: {
  userId?: string;
  action: string;
  entity?: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        ip: params.ip,
        userAgent: params.userAgent,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    console.error('[AUDIT LOG ERROR]', error);
  }
}
```

### 10.2. Structured Logging

```typescript
// Использовать pino для structured logging
// npm install pino

import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Пример:
logger.info({ userId, action: 'collection.create', collectionId }, 'Admin action');
logger.warn({ ip, attempts: 5 }, 'Rate limit exceeded');
logger.error({ error: error.message, stack: error.stack }, 'API error');
```

### 10.3. Health Check Endpoint

**Новый файл:** `src/app/api/health/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: 'disconnected',
      },
      { status: 503 }
    );
  }
}
```

### 10.4. Sentry Integration (опционально)

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

---

## 11. Backup и восстановление

### 11.1. Database Backup

```bash
#!/bin/bash
# backup-db.sh — cron job, запуск каждый час

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_URL=$DATABASE_URL

pg_dump $DB_URL | gzip > "$BACKUP_DIR/vr_studio_$TIMESTAMP.sql.gz"

# Хранить 7 дней hourly, 4 недели daily, 12 месяцев monthly
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### 11.2. File Backup

```bash
#!/bin/bash
# backup-uploads.sh — daily

rsync -avz --delete /var/www/vr-studio-360/uploads/ /backups/uploads/
```

### 11.3. Recovery Plan

| Сценарий | RTO | RPO | Процедура |
|----------|-----|-----|-----------|
| Database failure | 15 мин | 1 час | Восстановить из последнего hourly backup |
| File system failure | 30 мин | 24 часа | Восстановить uploads из daily rsync |
| Full disaster | 1 час | 1 час | Новый сервер → restore DB → restore files → deploy |

---

## 12. Compliance и GDPR

### 12.1. Data Minimization

- Email клиента — опциональное поле, шифровать в БД
- IP адреса — логировать только для audit и rate limiting, удалять через 90 дней
- Не собирать данные зрителей (неавторизованных посетителей)

### 12.2. Right to be Forgotten

```typescript
// API endpoint для удаления данных клиента
// DELETE /api/admin/clients/[id] — удалить клиента и все его access tokens
// Включая audit logs через 90 дней

// Анонимизация audit logs:
// UPDATE audit_logs SET userId = NULL, ip = NULL WHERE userId = $clientId AND createdAt < NOW() - INTERVAL '90 days'
```

### 12.3. Cookie Policy

- `admin-token` — strictly necessary cookie (не требует consent)
- Аналитика — только с consent (если будет добавлена)
- Cookie banner — не требуется пока только necessary cookies

### 12.4. Data Processing Agreement

- Шаблон DPA для клиентов (архитектурные бюро)
- Описание обрабатываемых данных
- Меры защиты
- Порядок уведомления о breach (72 часа)

---

## 13. Чек-лист внедрения

### P0 — Критические (немедленно)

- [ ] Убрать fallback JWT secret — throw если не задан
- [ ] Верифицировать JWT в middleware (не только наличие cookie)
- [ ] Добавить `/admin/clients` в защищённые пути middleware
- [ ] Защитить все `/api/admin/*` routes через middleware
- [ ] Миграция SQLite → PostgreSQL
- [ ] Безопасная генерация имени файла (UUID + verified extension)
- [ ] Ограничить `remotePatterns` в next.config.js
- [ ] Добавить security headers в next.config.js
- [ ] Сгенерировать сильный JWT_SECRET (32+ символов)
- [ ] Изменить дефолтный пароль admin

### P1 — Высокий приоритет (1-2 недели)

- [ ] Rate limiting на login (5 попыток / 15 минут)
- [ ] Rate limiting на API (60 запросов / минута)
- [ ] Cookie: `sameSite: 'strict'`, `secure: true`, `maxAge: 8h`
- [ ] Zod валидация на всех API routes
- [ ] Audit log для всех admin действий
- [ ] Health check endpoint
- [ ] `.env.example` с всеми переменными
- [ ] Docker + docker-compose
- [ ] Nginx reverse proxy конфигурация
- [ ] HTTPS enforcement

### P2 — Средний приоритет (1 месяц)

- [ ] File magic bytes verification
- [ ] Image re-encoding через sharp
- [ ] Structured logging (pino)
- [ ] Database backup automation
- [ ] File backup automation
- [ ] Sentry integration
- [ ] Password policy enforcement
- [ ] Session timeout (idle 30 мин)
- [ ] Failed login lockout
- [ ] Pagination на публичном API

### P3 — Долгосрочное (3 месяца)

- [ ] Redis-based rate limiting (multi-instance)
- [ ] Token revocation (Redis blacklist)
- [ ] Concurrent session limit
- [ ] Antivirus сканирование загрузок (ClamAV)
- [ ] GDPR compliance (DPA шаблон)
- [ ] Penetration testing
- [ ] OWASP Top 10 audit
- [ ] Load testing
- [ ] CDN с WAF (Cloudflare)
- [ ] DDoS protection

---

## Приложения

### A. Генерация секретов

```bash
# JWT_SECRET (48 bytes base64)
openssl rand -base64 48

# ENCRYPTION_KEY (32 bytes base64)
openssl rand -base64 32

# Admin password (strong)
openssl rand -base64 16
```

### B. Security Scan Commands

```bash
# Проверка зависимостей на уязвимости
npm audit

# ESLint security rules
npm install -D eslint-plugin-security

# Проверка заголовков
curl -I https://your-domain.com

# Проверка SSL
nmap --script ssl-enum-ciphers -p 443 your-domain.com
```

### C. OWASP Top 10 Mapping

| OWASP | Статус | Меры |
|-------|--------|------|
| A01 Broken Access Control | Частично | Middleware JWT verification, API route protection |
| A02 Cryptographic Failures | Частично | JWT secret hardening, AES-256 для email |
| A03 Injection | Защищено | Prisma ORM (parameterized queries) |
| A04 Insecure Design | В работе | Данное ТЗ |
| A05 Security Misconfiguration | В работе | Security headers, Docker, Nginx |
| A06 Vulnerable Components | Требует проверки | npm audit, Dependabot |
| A07 Auth Failures | Частично | Rate limiting, password policy, session timeout |
| A08 Software/Data Integrity | В работе | File verification, Zod validation |
| A09 Logging/Monitoring | В плане | Audit log, pino, Sentry |
| A10 SSRF | Частично | Ограничить remotePatterns |

---

**Документ подготовлен для внедрения enterprise-level безопасности.**
**Приоритет: P0 → немедленное внедрение, P1 → в текущий спринт.**
