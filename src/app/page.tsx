import { prisma } from '@/lib/prisma';
import CollectionCard from '@/components/CollectionCard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

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
    <div className="min-h-screen bg-ink-900">
      {/* Hero section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:64px_64px] opacity-40"></div>
        <div className="absolute inset-0 bg-radial-glow"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-20 sm:pb-32 text-center">
          <div className="inline-flex items-center gap-2 glass rounded-full px-3 sm:px-4 py-1.5 mb-6 sm:mb-10 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft"></span>
            <span className="text-xs text-ink-200 tracking-wide">360° визуализация интерьеров</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 animate-slide-up tracking-tightest">
            <span className="text-ink-50">VR Studio</span>
            <span className="gradient-text"> 360</span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-ink-200 max-w-2xl mx-auto mb-8 sm:mb-10 animate-slide-up font-light leading-relaxed px-2" style={{ animationDelay: '0.1s' }}>
            Платформа для просмотра панорамных 3D-визуализаций интерьеров.
            Исследуйте помещения, переходите между комнатами, сравнивайте «до» и «после».
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <a href="#collections" className="btn-accent w-full sm:w-auto">
              Смотреть проекты
            </a>
            <Link href="/admin/login" className="text-sm text-ink-200 hover:text-accent transition-colors">
              Вход для администратора →
            </Link>
          </div>
        </div>

        {/* Subtle gradient orbs */}
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-dim/5 rounded-full blur-3xl"></div>
      </section>

      {/* Features section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
              className="glass rounded-xl p-6 hover:border-bright transition-all duration-300"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/15 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={feature.icon} />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-ink-50 mb-2">{feature.title}</h3>
              <p className="text-sm text-ink-200 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Collections section */}
      <section id="collections" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="flex items-end justify-between mb-6 sm:mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-ink-50 tracking-tight">Проекты</h2>
            <p className="text-sm text-ink-300 mt-1">Публичные 360° туры</p>
          </div>
        </div>

        {collections.length === 0 ? (
          <div className="glass rounded-xl p-8 sm:p-16 text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-ink-200">Пока нет публичных проектов</p>
            <p className="text-sm text-ink-300 mt-2">Новые коллекции скоро появятся</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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
      <footer className="border-t border-border-subtle mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-bright to-accent-dim flex items-center justify-center">
              <span className="text-ink-900 font-bold text-xs">V</span>
            </div>
            <span className="text-sm text-ink-200 font-medium">VR Studio 360</span>
          </div>
          <p className="text-xs text-ink-300">
            Платформа визуализации интерьеров
          </p>
        </div>
      </footer>
    </div>
  );
}
