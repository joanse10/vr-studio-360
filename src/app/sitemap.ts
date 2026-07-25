import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://vr-studio-360.vercel.app';

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];

  try {
    const collections = await prisma.collection.findMany({
      where: { status: 'public' },
      select: { slug: true, updatedAt: true },
    });

    const collectionPages: MetadataRoute.Sitemap = collections.map((c) => ({
      url: `${baseUrl}/collection/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.8,
    }));

    return [...staticPages, ...collectionPages];
  } catch {
    return staticPages;
  }
}
