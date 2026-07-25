import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/utils';

export async function GET() {
  try {
    const collections = await prisma.collection.findMany({
      where: { status: 'public' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        coverImage: true,
        createdAt: true,
        rooms: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(collections);
  } catch {
    return NextResponse.json([]);
  }
}
