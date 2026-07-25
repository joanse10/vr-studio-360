import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const collection = await prisma.collection.findUnique({
      where: { id: params.id },
      include: {
        rooms: {
          orderBy: { order: 'asc' },
          include: { hotspotsFrom: true },
        },
        beforeAfters: { orderBy: { order: 'asc' } },
        shareLinks: true,
        clientAccess: { include: { client: true } },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: 'Не найдено' }, { status: 404 });
    }

    return NextResponse.json(collection);
  } catch {
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.coverImage !== undefined) updateData.coverImage = body.coverImage;

    const collection = await prisma.collection.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(collection);
  } catch {
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    await prisma.collection.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}
