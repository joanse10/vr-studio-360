import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { status, comment, accessToken } = await req.json();

    const collection = await prisma.collection.findUnique({
      where: { slug: params.slug },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Коллекция не найдена' }, { status: 404 });
    }

    if (accessToken) {
      const access = await prisma.clientAccess.findUnique({
        where: { accessToken },
      });

      if (access && access.collectionId === collection.id) {
        await prisma.clientAccess.update({
          where: { id: access.id },
          data: {
            status: status || 'viewed',
            comment: comment || null,
            viewedAt: new Date(),
            ...(status === 'approved' ? { approvedAt: new Date() } : {}),
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}
