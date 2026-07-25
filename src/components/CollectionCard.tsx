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
    public: { label: 'Публичная', color: 'text-green-400' },
    private: { label: 'Приватная', color: 'text-yellow-400' },
    closed: { label: 'Закрыта', color: 'text-red-400' },
  };

  const statusInfo = statusConfig[status] || statusConfig.private;

  return (
    <Link href={`/collection/${slug}`} className="group block">
      <div className="glass rounded-xl overflow-hidden transition-all duration-300 hover:neon-border hover:-translate-y-1">
        <div className="relative aspect-video overflow-hidden bg-dark-card">
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-card to-dark-bg">
              <svg className="w-16 h-16 text-dark-border" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <circle cx="12" cy="13" r="3" strokeWidth={1} />
              </svg>
            </div>
          )}
          <div className="absolute top-3 right-3 glass-strong rounded-full px-3 py-1">
            <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
          </div>
          {roomCount > 0 && (
            <div className="absolute bottom-3 left-3 glass-strong rounded-full px-3 py-1">
              <span className="text-xs text-neon-cyan neon-text">{roomCount} комнат</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-100 group-hover:text-neon-cyan transition-colors duration-300">
            {title}
          </h3>
          <p className="text-sm text-gray-400 mt-1 line-clamp-2">
            {truncate(description || 'Описание отсутствует', 100)}
          </p>
          <p className="text-xs text-gray-500 mt-3">{formatDate(createdAt)}</p>
        </div>
      </div>
    </Link>
  );
}
