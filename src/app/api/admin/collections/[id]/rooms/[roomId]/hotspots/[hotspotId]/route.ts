import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; roomId: string; hotspotId: string } }
) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    await prisma.hotspot.delete({ where: { id: params.hotspotId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка удаления hotspot' }, { status: 500 });
  }
}
