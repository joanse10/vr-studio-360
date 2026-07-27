import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    const { title, description, imageUrl, linkUrl, linkText, yaw, pitch } = await req.json();

    if (!title || yaw === undefined || pitch === undefined) {
      return NextResponse.json({ error: 'Укажите название и координаты' }, { status: 400 });
    }

    const hotspot = await prisma.infoHotspot.create({
      data: {
        roomId: params.roomId,
        title,
        description: description || '',
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        linkText: linkText || 'Купить',
        yaw: parseFloat(yaw),
        pitch: parseFloat(pitch),
      },
    });

    return NextResponse.json(hotspot, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ошибка создания info hotspot' }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; roomId: string } }
) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    const hotspots = await prisma.infoHotspot.findMany({
      where: { roomId: params.roomId },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(hotspots);
  } catch {
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}
