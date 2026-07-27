import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface Props {
  params: { token: string };
}

async function getClientByToken(token: string) {
  try {
    const client = await prisma.client.findUnique({
      where: { accessToken: token },
      include: {
        access: {
          include: {
            collection: {
              include: {
                rooms: { orderBy: { order: 'asc' } },
                beforeAfters: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    return client;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const client = await getClientByToken(params.token);

  if (!client) {
    return {
      title: 'Ссылка недействительна',
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${client.name} — VR Studio 360`,
    description: 'Ваши 360° визуализации',
    robots: { index: false, follow: false },
  };
}

export default async function ClientPortalPage({ params }: Props) {
  const client = await getClientByToken(params.token);

  if (!client) {
    notFound();
  }

  const activeAccess = client.access.filter(
    (a) => a.collection.status !== 'closed'
  );

  return (
    <div className="min-h-screen bg-ink-900">
      {/* Header */}
      <header className="glass-strong border-b border-border-subtle sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-bright to-accent-dim flex items-center justify-center">
              <span className="text-ink-900 font-bold text-xs">V</span>
            </div>
            <span className="text-sm text-ink-50 font-medium tracking-tight">VR Studio 360</span>
          </Link>
          <span className="text-xs text-ink-300 glass rounded-full px-3 py-1">
            {client.name}
          </span>
        </div>
      </header>

      {/* Welcome */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-ink-50 mb-2 tracking-tight">
          Здравствуйте, {client.name}!
        </h1>
        <p className="text-ink-200 max-w-2xl leading-relaxed">
          Здесь собраны все ваши 360° визуализации. Выберите проект, чтобы посмотреть тур и сравнения «До / После».
        </p>
      </section>

      {/* Collections grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {activeAccess.length === 0 ? (
          <div className="glass rounded-xl p-12 sm:p-16 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-ink-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-ink-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <p className="text-ink-200 text-sm">Вам пока не назначено ни одного проекта</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {activeAccess.map((access) => {
              const col = access.collection;
              const roomCount = col.rooms.length;
              const baCount = col.beforeAfters.length;
              return (
                <Link
                  key={access.id}
                  href={`/share/${access.accessToken}`}
                  className="group glass rounded-xl overflow-hidden hover:border-bright transition-all duration-300"
                >
                  {/* Cover */}
                  <div className="relative aspect-video bg-ink-800 overflow-hidden">
                    {col.coverImage ? (
                      <img
                        src={col.coverImage}
                        alt={col.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-bright/20 to-accent-dim/20 flex items-center justify-center">
                          <span className="text-accent text-lg font-bold">360°</span>
                        </div>
                      </div>
                    )}
                    {/* Status badge */}
                    <div className="absolute top-3 left-3 glass-strong rounded-full px-2.5 py-0.5">
                      <span className="text-xs text-ink-100">
                        {col.status === 'public' ? 'Публичная' : 'Приватная'}
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-ink-50 mb-1 truncate group-hover:text-accent transition-colors">
                      {col.title}
                    </h3>
                    {col.description && (
                      <p className="text-xs text-ink-300 line-clamp-2 mb-3">{col.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-ink-300">
                      {roomCount > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                          </svg>
                          {roomCount} {roomCount === 1 ? 'комната' : roomCount < 5 ? 'комнаты' : 'комнат'}
                        </span>
                      )}
                      {baCount > 0 && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7l8 8m0-8l-8 8" />
                          </svg>
                          {baCount} До/После
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-400 mt-2">{formatDate(col.createdAt)}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <footer className="border-t border-border-subtle">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-sm text-ink-300">VR Studio 360</p>
        </div>
      </footer>
    </div>
  );
}
