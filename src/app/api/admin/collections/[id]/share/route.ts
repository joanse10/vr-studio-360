import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthenticated, unauthorizedResponse } from '@/lib/auth';
import { generateToken } from '@/lib/utils';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAuthenticated(req)) return unauthorizedResponse();

  try {
    const { label } = await req.json();

    const link = await prisma.shareLink.create({
      data: {
        collectionId: params.id,
        token: generateToken(),
        type: 'private',
        label: label || 'Ссылка',
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Ошибка создания ссылки' }, { status: 500 });
  }
}
