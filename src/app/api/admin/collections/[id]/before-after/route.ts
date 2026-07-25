import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const { title, beforeImage, afterImage } = await req.json();

    if (!beforeImage || !afterImage) {
      return NextResponse.json({ error: 'Загрузите оба изображения' }, { status: 400 });
    }

    const baCount = await prisma.beforeAfter.count({
      where: { collectionId: params.id },
    });

    const ba = await prisma.beforeAfter.create({
      data: {
        collectionId: params.id,
        title: title || '',
        beforeImage,
        afterImage,
        order: baCount,
      },
    });

    return NextResponse.json(ba, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ошибка создания пары' }, { status: 500 });
  }
}
