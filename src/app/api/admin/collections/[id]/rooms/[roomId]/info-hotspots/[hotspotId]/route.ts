import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; roomId: string; hotspotId: string } }
) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { yaw, pitch, title, description, imageUrl, linkUrl, linkText } = body;

    const data: Record<string, unknown> = {};
    if (yaw !== undefined) data.yaw = parseFloat(yaw);
    if (pitch !== undefined) data.pitch = parseFloat(pitch);
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (imageUrl !== undefined) data.imageUrl = imageUrl || null;
    if (linkUrl !== undefined) data.linkUrl = linkUrl || null;
    if (linkText !== undefined) data.linkText = linkText;

    const hotspot = await prisma.infoHotspot.update({
      where: { id: params.hotspotId },
      data,
    });

    return NextResponse.json(hotspot);
  } catch {
    return NextResponse.json({ error: 'Ошибка обновления' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; roomId: string; hotspotId: string } }
) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    await prisma.infoHotspot.delete({
      where: { id: params.hotspotId },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка удаления' }, { status: 500 });
  }
}
