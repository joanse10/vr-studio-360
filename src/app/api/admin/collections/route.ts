import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse, getTokenFromRequest, verifyToken } from '@/lib/auth';
import { slugify, generateToken } from '@/lib/utils';
import { createCollectionSchema } from '@/lib/validation';
import { auditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    const collections = await prisma.collection.findMany({
      include: {
        rooms: { select: { id: true, name: true, order: true } },
        _count: { select: { shareLinks: true, clientAccess: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(collections);
  } catch {
    return NextResponse.json({ error: 'Ошибка получения коллекций' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = createCollectionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Неверный формат данных', details: parsed.error.flatten() }, { status: 400 });
    }

    const { title, description, status, coverImage, rooms, beforeAfters } = parsed.data;

    let slug = slugify(title);
    const existing = await prisma.collection.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const collection = await prisma.collection.create({
      data: {
        slug,
        title,
        description: description || '',
        status: status || 'private',
        coverImage: coverImage || null,
        rooms: {
          create: (rooms || []).map((room: any, idx: number) => ({
            name: room.name,
            order: idx,
            panoramaUrl: room.panoramaUrl,
          })),
        },
        beforeAfters: {
          create: (beforeAfters || []).map((ba: any, idx: number) => ({
            title: ba.title || '',
            beforeImage: ba.beforeImage,
            afterImage: ba.afterImage,
            order: idx,
          })),
        },
        shareLinks: {
          create: {
            token: generateToken(),
            type: status === 'public' ? 'public' : 'private',
            label: 'Основная ссылка',
          },
        },
      },
    });

    const token = getTokenFromRequest(req);
    const payload = token ? await verifyToken(token) : null;
    await auditLog({
      userId: payload?.userId,
      action: 'collection.create',
      entity: 'collection',
      entityId: collection.id,
      metadata: { title, slug },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка создания коллекции' }, { status: 500 });
  }
}
