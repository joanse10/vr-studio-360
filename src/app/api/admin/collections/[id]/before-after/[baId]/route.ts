import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; baId: string } }
) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    await prisma.beforeAfter.delete({ where: { id: params.baId } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Ошибка удаления пары' }, { status: 500 });
  }
}
