import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse, getTokenFromRequest, verifyToken } from '@/lib/auth';
import { generateToken } from '@/lib/utils';
import { createClientSchema } from '@/lib/validation';
import { auditLog } from '@/lib/audit';

export async function GET(req: NextRequest) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    const clients = await prisma.client.findMany({
      include: {
        access: { include: { collection: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(clients);
  } catch {
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated(req))) return unauthorizedResponse();

  try {
    const body = await req.json();
    const parsed = createClientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Неверный формат данных', details: parsed.error.flatten() }, { status: 400 });
    }

    const { name, email, collectionId } = parsed.data;

    if (!name) {
      return NextResponse.json({ error: 'Введите имя клиента' }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name,
        email: email || null,
        accessToken: generateToken(),
        ...(collectionId
          ? {
              access: {
                create: {
                  collectionId,
                  accessToken: generateToken(),
                },
              },
            }
          : {}),
      },
      include: { access: true },
    });

    const token = getTokenFromRequest(req);
    const payload = token ? await verifyToken(token) : null;
    await auditLog({
      userId: payload?.userId,
      action: 'client.create',
      entity: 'client',
      entityId: client.id,
      metadata: { name },
    });

    return NextResponse.json(client, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ошибка создания клиента' }, { status: 500 });
  }
}
