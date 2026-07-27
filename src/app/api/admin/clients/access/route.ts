import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse, getTokenFromRequest, verifyToken } from '@/lib/auth';
import { generateToken } from '@/lib/utils';
import { auditLog } from '@/lib/audit';

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    const { clientId, collectionId } = await req.json();

    if (!clientId || !collectionId) {
      return NextResponse.json({ error: 'Укажите clientId и collectionId' }, { status: 400 });
    }

    const existing = await prisma.clientAccess.findFirst({
      where: { clientId, collectionId },
    });

    if (existing) {
      return NextResponse.json({ error: 'Коллекция уже назначена' }, { status: 400 });
    }

    const access = await prisma.clientAccess.create({
      data: {
        clientId,
        collectionId,
        accessToken: generateToken(),
      },
      include: { collection: true },
    });

    const token = getTokenFromRequest(req);
    const payload = token ? await verifyToken(token) : null;
    await auditLog({
      userId: payload?.userId,
      action: 'client.access.grant',
      entity: 'clientAccess',
      entityId: access.id,
      metadata: { clientId, collectionId },
    });

    return NextResponse.json(access, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ошибка назначения коллекции' }, { status: 500 });
  }
}
