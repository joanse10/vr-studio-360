import AdminLayout from '@/components/AdminLayout';
import { prisma } from '@/lib/prisma';
import CollectionCard from '@/components/CollectionCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getCollections() {
  try {
    const collections = await prisma.collection.findMany({
      include: {
        rooms: { select: { id: true } },
        _count: { select: { shareLinks: true, clientAccess: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return collections;
  } catch {
    return [];
  }
}

async function getStats() {
  try {
    const [totalCollections, totalRooms, totalClients, totalShares] = await Promise.all([
      prisma.collection.count(),
      prisma.room.count(),
      prisma.client.count(),
      prisma.shareLink.count(),
    ]);
    return { totalCollections, totalRooms, totalClients, totalShares };
  } catch {
    return { totalCollections: 0, totalRooms: 0, totalClients: 0, totalShares: 0 };
  }
}

export default async function DashboardPage() {
  const [collections, stats] = await Promise.all([getCollections(), getStats()]);

  return (
    <AdminLayout>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-ink-50 mb-1 tracking-tight">Дашборд</h1>
        <p className="text-sm text-ink-300">Управление коллекциями и клиентами</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Коллекции', value: stats.totalCollections, icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
          { label: 'Комнаты', value: stats.totalRooms, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
          { label: 'Клиенты', value: stats.totalClients, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
          { label: 'Ссылки', value: stats.totalShares, icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
        ].map((stat, idx) => (
          <div key={idx} className="glass rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center">
                <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                </svg>
              </div>
            </div>
            <p className="text-xl sm:text-2xl font-bold text-ink-50">{stat.value}</p>
            <p className="text-xs text-ink-300 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Collections */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-semibold text-ink-50">Коллекции</h2>
        <Link href="/admin/collections/new" className="btn-accent text-sm">
          + Создать
        </Link>
      </div>

      {collections.length === 0 ? (
        <div className="glass rounded-xl p-8 sm:p-16 text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-ink-200 mb-4">Нет коллекций</p>
          <Link href="/admin/collections/new" className="btn-accent inline-block">
            Создать первую коллекцию
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {collections.map((collection) => (
            <div key={collection.id} className="relative group">
              <CollectionCard
                id={collection.id}
                slug={collection.slug}
                title={collection.title}
                description={collection.description}
                coverImage={collection.coverImage}
                roomCount={collection.rooms.length}
                createdAt={collection.createdAt}
                status={collection.status}
              />
              <Link
                href={`/admin/collections/${collection.id}`}
                className="absolute top-3 left-3 glass-strong rounded-lg px-3 py-1.5 text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity z-20"
              >
                Редактировать
              </Link>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
