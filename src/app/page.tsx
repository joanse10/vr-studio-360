import { prisma } from '@/lib/prisma';
import CollectionCard from '@/components/CollectionCard';
import Link from 'next/link';

async function getPublicCollections() {
  try {
    const collections = await prisma.collection.findMany({
      where: { status: 'public' },
      include: {
        rooms: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return collections;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const collections = await getPublicCollections();

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-30"></div>
        <div className="absolute inset-0 bg-radial-glow"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-neon-cyan animate-glow-pulse"></span>
            <span className="text-xs text-gray-400">360° визуализация интерьеров</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 animate-slide-up">
            <span className="gradient-text">VR Studio</span>
            <span className="text-white"> 360</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            Платформа для просмотра панорамных 3D-визуализаций интерьеров.
            Исследуйте помещения, переходите между комнатами, сравнивайте «до» и «после».
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <a href="#collections" className="btn-neon">
              Смотреть проекты
            </a>
            <Link href="/admin/login" className="text-sm text-gray-400 hover:text-neon-cyan transition-colors">
              Вход для администратора →
            </Link>
          </div>
        </div>

        {/* Decorative gradient orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl"></div>
      </section>

      {/* Features section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: '360° панорамы',
              description: 'Полное погружение в интерьер. Управление мышью, тачем или гироскопом.',
              icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0z M12 8v4l3 3',
            },
            {
              title: 'Переходы между комнатами',
              description: 'Hotspots на панораме позволяют перемещаться из комнаты в комнату.',
              icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3',
            },
            {
              title: 'До / После',
              description: 'Сравнивайте оригинальное помещение с 3D-рендером в один клик.',
              icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="glass rounded-xl p-6 hover:neon-border transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-neon-cyan/20 to-neon-purple/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Collections section */}
      <section id="collections" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">
            <span className="gradient-text">Проекты</span>
          </h2>
        </div>

        {collections.length === 0 ? (
          <div className="glass rounded-xl p-16 text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-dark-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-gray-400">Пока нет публичных проектов</p>
            <p className="text-sm text-gray-500 mt-2">Новые коллекции скоро появятся</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                id={collection.id}
                slug={collection.slug}
                title={collection.title}
                description={collection.description}
                coverImage={collection.coverImage}
                roomCount={collection.rooms.length}
                createdAt={collection.createdAt}
                status={collection.status}
              />
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-dark-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm text-gray-500">
            VR Studio 360 — Платформа визуализации интерьеров
          </p>
        </div>
      </footer>
    </div>
  );
}
