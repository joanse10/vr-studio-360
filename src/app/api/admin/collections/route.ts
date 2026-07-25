import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { slugify, generateToken } from '@/lib/utils';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

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
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const { title, description, status, coverImage, rooms, beforeAfters } = await req.json();

    if (!title) {
      return NextResponse.json({ error: 'Введите название' }, { status: 400 });
    }

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

    return NextResponse.json(collection, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка создания коллекции' }, { status: 500 });
  }
}
