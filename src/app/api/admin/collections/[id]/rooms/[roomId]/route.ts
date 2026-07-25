import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const body = await req.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.panoramaUrl !== undefined) updateData.panoramaUrl = body.panoramaUrl;

    const room = await prisma.room.update({
      where: { id: params.roomId },
      data: updateData,
    });

    return NextResponse.json(room);
  } catch {
    return NextResponse.json({ error: 'Ошибка обновления комнаты' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    await prisma.room.delete({ where: { id: params.roomId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка удаления комнаты' }, { status: 500 });
  }
}
