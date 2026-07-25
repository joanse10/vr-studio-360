import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const { name, panoramaUrl } = await req.json();

    if (!name || !panoramaUrl) {
      return NextResponse.json({ error: 'Введите название и загрузите панораму' }, { status: 400 });
    }

    const roomCount = await prisma.room.count({
      where: { collectionId: params.id },
    });

    const room = await prisma.room.create({
      data: {
        collectionId: params.id,
        name,
        panoramaUrl,
        order: roomCount,
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ошибка создания комнаты' }, { status: 500 });
  }
}
