import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import ViewerWithNavigator from '@/components/ViewerWithNavigator';
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

  return {
    title: collection.title,
    description: collection.description || `360° визуализация: ${collection.title}`,
    openGraph: {
      title: collection.title,
      description: collection.description || `360° визуализация: ${collection.title}`,
      images: collection.coverImage ? [{ url: collection.coverImage }] : [],
      type: 'website',
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
  }));

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="glass-strong border-b border-dark-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
              <span className="text-dark-bg font-bold text-sm">V</span>
            </div>
            <span className="text-sm gradient-text font-bold">VR Studio 360</span>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-neon-cyan transition-colors">
            ← Все проекты
          </Link>
        </div>
      </header>

      {/* Title section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2">{collection.title}</h1>
        {collection.description && (
          <p className="text-gray-400 max-w-3xl">{collection.description}</p>
        )}
        <p className="text-xs text-gray-500 mt-2">{formatDate(collection.createdAt)}</p>
      </section>

      {/* 360 Viewer */}
      {rooms.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-xl font-semibold text-white">360° Тур</h2>
            <span className="text-xs text-gray-500">({rooms.length} комнат)</span>
          </div>
          <div className="relative w-full rounded-xl overflow-hidden neon-border" style={{ height: '70vh', minHeight: '400px' }}>
            <ViewerWithNavigator rooms={rooms} />
          </div>
        </section>
      )}

      {/* Before/After section */}
      {collection.beforeAfters.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">До / После</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {collection.beforeAfters.map((ba) => (
              <div key={ba.id} className="space-y-2">
                {ba.title && (
                  <h3 className="text-sm text-gray-400">{ba.title}</h3>
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
            <p className="text-gray-400">Контент ещё не добавлен в эту коллекцию</p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-dark-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm text-gray-500">VR Studio 360</p>
        </div>
      </footer>
    </div>
  );
}
