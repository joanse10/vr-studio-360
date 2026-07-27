import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp, RATE_LIMITS } from '@/lib/rateLimit';

const MAX_PER_PAGE = 50;

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`api:${ip}`, RATE_LIMITS.API_GENERAL.limit, RATE_LIMITS.API_GENERAL.windowMs);
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(MAX_PER_PAGE, Math.max(1, parseInt(url.searchParams.get('limit') || '12')));
    const skip = (page - 1) * limit;

    const [collections, total] = await Promise.all([
      prisma.collection.findMany({
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
        skip,
        take: limit,
      }),
      prisma.collection.count({ where: { status: 'public' } }),
    ]);

    return NextResponse.json({
      data: collections,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch {
    return NextResponse.json({ data: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } });
  }
}
