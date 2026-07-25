import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import ViewerWithNavigator from '@/components/ViewerWithNavigator';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface Props {
  params: { token: string };
}

async function getCollectionByToken(token: string) {
  try {
    const shareLink = await prisma.shareLink.findUnique({
      where: { token },
      include: {
        collection: {
          include: {
            rooms: {
              orderBy: { order: 'asc' },
              include: { hotspotsFrom: true },
            },
            beforeAfters: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!shareLink) return null;
    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) return null;
    if (shareLink.collection.status === 'closed') return null;

    return shareLink;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const shareLink = await getCollectionByToken(params.token);

  if (!shareLink) {
    return {
      title: 'Ссылка недействительна',
      robots: { index: false, follow: false },
    };
  }

  const collection = shareLink.collection;

  return {
    title: collection.title,
    description: collection.description || `360° визуализация: ${collection.title}`,
    openGraph: {
      title: collection.title,
      description: collection.description || `360° визуализация: ${collection.title}`,
      images: collection.coverImage ? [{ url: collection.coverImage }] : [],
    },
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({ params }: Props) {
  const shareLink = await getCollectionByToken(params.token);

  if (!shareLink) {
    notFound();
  }

  const collection = shareLink.collection;

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
      <header className="glass-strong border-b border-dark-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
              <span className="text-dark-bg font-bold text-sm">V</span>
            </div>
            <span className="text-sm gradient-text font-bold">VR Studio 360</span>
          </Link>
          {shareLink.label && (
            <span className="text-xs text-gray-500 glass rounded-full px-3 py-1">
              {shareLink.label}
            </span>
          )}
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold gradient-text mb-2">{collection.title}</h1>
        {collection.description && (
          <p className="text-gray-400 max-w-3xl">{collection.description}</p>
        )}
        <p className="text-xs text-gray-500 mt-2">{formatDate(collection.createdAt)}</p>
      </section>

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

      {collection.beforeAfters.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
          <h2 className="text-xl font-semibold text-white mb-4">До / После</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {collection.beforeAfters.map((ba) => (
              <div key={ba.id} className="space-y-2">
                {ba.title && <h3 className="text-sm text-gray-400">{ba.title}</h3>}
                <BeforeAfterSlider
                  beforeImage={ba.beforeImage}
                  afterImage={ba.afterImage}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-dark-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm text-gray-500">VR Studio 360</p>
        </div>
      </footer>
    </div>
  );
}
