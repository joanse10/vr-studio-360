import Link from 'next/link';
import { formatDate, truncate } from '@/lib/utils';

interface CollectionCardProps {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string | null;
  roomCount: number;
  createdAt: Date;
  status: string;
}

export default function CollectionCard({
  slug,
  title,
  description,
  coverImage,
  roomCount,
  createdAt,
  status,
}: CollectionCardProps) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    public: { label: 'Публичная', color: 'text-emerald-400/80' },
    private: { label: 'Приватная', color: 'text-amber-400/80' },
    closed: { label: 'Закрыта', color: 'text-red-400/80' },
  };

  const statusInfo = statusConfig[status] || statusConfig.private;

  return (
    <Link href={`/collection/${slug}`} className="group block">
      <div className="glass rounded-xl overflow-hidden transition-all duration-300 hover:border-bright hover:-translate-y-0.5">
        <div className="relative aspect-video overflow-hidden bg-ink-800">
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-ink-800 to-ink-900">
              <svg className="w-12 h-12 text-ink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3" strokeWidth={1} />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/60 via-transparent to-transparent" />
          <div className="absolute top-3 right-3 glass-strong rounded-full px-2.5 py-0.5">
            <span className={`text-[11px] font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>
          {roomCount > 0 && (
            <div className="absolute bottom-3 left-3 glass-strong rounded-full px-2.5 py-0.5">
              <span className="text-[11px] text-accent-bright font-medium">{roomCount} комнат</span>
            </div>
          )}
        </div>
        <div className="p-4 sm:p-5">
          <h3 className="text-base font-semibold text-ink-50 group-hover:text-accent transition-colors duration-300 tracking-tight">
            {title}
          </h3>
          <p className="text-sm text-ink-200 mt-1.5 line-clamp-2 leading-relaxed">
            {truncate(description || 'Описание отсутствует', 100)}
          </p>
          <p className="text-xs text-ink-300 mt-3">{formatDate(createdAt)}</p>
        </div>
      </div>
    </Link>
  );
}
