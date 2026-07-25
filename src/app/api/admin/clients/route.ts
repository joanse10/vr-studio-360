import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { generateToken } from '@/lib/utils';

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

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
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const { name, email, collectionId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Введите имя клиента' }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        name,
        email: email || null,
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

    return NextResponse.json(client, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ошибка создания клиента' }, { status: 500 });
  }
}
