import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    const { toRoomId, yaw, pitch, label } = await req.json();

    if (!toRoomId || yaw === undefined || pitch === undefined) {
      return NextResponse.json({ error: 'Укажите комнату и координаты' }, { status: 400 });
    }

    const hotspot = await prisma.hotspot.create({
      data: {
        fromRoomId: params.roomId,
        toRoomId,
        yaw: parseFloat(yaw),
        pitch: parseFloat(pitch),
        label: label || 'Перейти',
        icon: 'arrow',
      },
    });

    return NextResponse.json(hotspot, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ошибка создания hotspot' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    const hotspots = await prisma.hotspot.findMany({
      where: { fromRoomId: params.roomId },
      include: { toRoom: { select: { id: true, name: true } } },
    });
    return NextResponse.json(hotspots);
  } catch {
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}
