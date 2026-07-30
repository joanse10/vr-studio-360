import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import ViewerWithNavigator from '@/components/ViewerWithNavigator';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface Props {
  params: { slug: string };
}

async function getCollection(slug: string) {
  try {
    const collection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        rooms: {
          orderBy: { order: 'asc' },
          include: {
            hotspotsFrom: true,
            infoHotspots: true,
          },
        },
        beforeAfters: {
          orderBy: { order: 'asc' },
        },
      },
    });
    return collection;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const collection = await getCollection(params.slug);

  if (!collection || collection.status === 'closed') {
    return {
      title: 'Коллекция не найдена',
      robots: { index: false, follow: false },
    };
  }

  const isPublic = collection.status === 'public';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://360.deznot.com';
  const coverImage = collection.coverImage
    ? (collection.coverImage.startsWith('http') ? collection.coverImage : `${baseUrl}${collection.coverImage}`)
    : (collection.rooms[0]?.panoramaUrl
      ? (collection.rooms[0].panoramaUrl.startsWith('http') ? collection.rooms[0].panoramaUrl : `${baseUrl}${collection.rooms[0].panoramaUrl}`)
      : undefined);

  return {
    title: collection.title,
    description: collection.description || `360° визуализация: ${collection.title}`,
    openGraph: {
      title: collection.title,
      description: collection.description || `360° визуализация: ${collection.title}`,
      images: coverImage ? [{ url: coverImage, width: 1200, height: 630 }] : [],
      type: 'website',
      url: `${baseUrl}/collection/${params.slug}`,
      siteName: 'VR Studio 360',
      locale: 'ru_RU',
    },
    twitter: {
      card: 'summary_large_image',
      title: collection.title,
      description: collection.description || `360° визуализация: ${collection.title}`,
      images: coverImage ? [coverImage] : [],
    },
    robots: isPublic ? { index: true, follow: true } : { index: false, follow: false },
  };
}

export default async function CollectionPage({ params }: Props) {
  const collection = await getCollection(params.slug);

  if (!collection || collection.status === 'closed') {
    notFound();
  }

  const rooms = collection.rooms.map((room) => ({
    id: room.id,
    name: room.name,
    panoramaUrl: room.panoramaUrl,
    initialYaw: room.initialYaw,
    initialPitch: room.initialPitch,
    initialHfov: room.initialHfov,
    hotspots: room.hotspotsFrom.map((h) => ({
      id: h.id,
      yaw: h.yaw,
      pitch: h.pitch,
      toRoomId: h.toRoomId,
      label: h.label,
      icon: h.icon,
    })),
    infoHotspots: room.infoHotspots.map((ih) => ({
      id: ih.id,
      title: ih.title,
      description: ih.description,
      imageUrl: ih.imageUrl,
      linkUrl: ih.linkUrl,
      linkText: ih.linkText,
      yaw: ih.yaw,
      pitch: ih.pitch,
    })),
  }));

  return (
    <div className="min-h-screen bg-ink-900">
      {/* Header */}
      <header className="glass-strong border-b border-border-subtle sticky top-0 z-[500]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-bright to-accent-dim flex items-center justify-center">
              <span className="text-ink-900 font-bold text-xs">V</span>
            </div>
            <span className="text-sm text-ink-50 font-medium tracking-tight">VR Studio 360</span>
          </Link>
          <Link href="/" className="text-sm text-ink-200 hover:text-accent transition-colors">
            ← Все проекты
          </Link>
        </div>
      </header>

      {/* Title section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-ink-50 mb-2 tracking-tight">{collection.title}</h1>
        {collection.description && (
          <p className="text-ink-200 max-w-3xl leading-relaxed">{collection.description}</p>
        )}
        <p className="text-xs text-ink-300 mt-3">{formatDate(collection.createdAt)}</p>
      </section>

      {/* 360 Viewer */}
      {rooms.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-12">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-ink-50">360° Тур</h2>
            <span className="text-xs text-ink-300">({rooms.length} комнат)</span>
          </div>
          <div className="relative w-full rounded-xl overflow-hidden accent-border" style={{ height: '60vh', minHeight: '300px' }}>
            <ViewerWithNavigator rooms={rooms} />
          </div>
        </section>
      )}

      {/* Before/After inline */}
      {collection.beforeAfters.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 sm:mb-12">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-ink-50">До / После</h2>
            <span className="text-xs text-ink-300">({collection.beforeAfters.length})</span>
          </div>
          <div className="space-y-6">
            {collection.beforeAfters.map((ba) => (
              <div key={ba.id} className="space-y-2">
                {ba.title && (
                  <h3 className="text-sm font-medium text-ink-100">{ba.title}</h3>
                )}
                <BeforeAfterSlider
                  beforeImage={ba.beforeImage}
                  afterImage={ba.afterImage}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {rooms.length === 0 && collection.beforeAfters.length === 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="glass rounded-xl p-16 text-center">
            <p className="text-ink-200">Контент ещё не добавлен в эту коллекцию</p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border-subtle mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm text-ink-300">VR Studio 360</p>
        </div>
      </footer>
    </div>
  );
}
