'use client';

import { useState } from 'react';

interface CollectionInfo {
  id: string;
  title: string;
  slug: string;
  status: string;
}

interface AccessInfo {
  id: string;
  status: string;
  comment: string | null;
  accessToken: string;
  viewedAt: string | null;
  approvedAt: string | null;
  collection: CollectionInfo;
}

interface ClientInfo {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
  access: AccessInfo[];
}

interface ClientsManagerProps {
  clients: ClientInfo[];
  collections: CollectionInfo[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидает', color: 'text-gray-400' },
  viewed: { label: 'Просмотрено', color: 'text-blue-400' },
  approved: { label: 'Одобрено', color: 'text-green-400' },
  rejected: { label: 'Отклонено', color: 'text-red-400' },
};

export default function ClientsManager({ clients, collections }: ClientsManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedToken, setCopiedToken] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email || null, collectionId: selectedCollection || null }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        setError(data.error || 'Ошибка');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
  };

  const handleToggleStatus = async (collectionId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'closed' ? 'private' : 'closed';
    try {
      await fetch(`/api/admin/collections/${collectionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      window.location.reload();
    } catch {
      setError('Ошибка обновления статуса');
    }
  };

  return (
    <div className="space-y-6">
      {/* Create client */}
      <div className="glass rounded-xl p-6">
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-neon text-sm"
        >
          {showForm ? 'Скрыть форму' : '+ Добавить клиента'}
        </button>

        {showForm && (
          <form onSubmit={handleCreate} className="mt-4 space-y-4">
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Имя клиента *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-cyan/50"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Email (опционально)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-cyan/50"
                  placeholder="client@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Назначить коллекцию</label>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-cyan/50"
              >
                <option value="">Без коллекции</option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            <button type="submit" disabled={loading} className="btn-neon">
              {loading ? 'Создание...' : 'Создать клиента'}
            </button>
          </form>
        )}
      </div>

      {/* Clients list */}
      {clients.length === 0 ? (
        <div className="glass rounded-xl p-16 text-center">
          <p className="text-gray-400">Нет клиентов</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => (
            <div key={client.id} className="glass rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{client.name}</h3>
                  {client.email && <p className="text-sm text-gray-500">{client.email}</p>}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(client.createdAt).toLocaleDateString('ru-RU')}
                </span>
              </div>

              {client.access.length > 0 ? (
                <div className="space-y-3">
                  {client.access.map((access) => {
                    const status = statusConfig[access.status] || statusConfig.pending;
                    return (
                      <div key={access.id} className="bg-dark-card border border-dark-border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-300">{access.collection.title}</span>
                            <span className={`text-xs ${status.color}`}>● {status.label}</span>
                          </div>
                          <button
                            onClick={() => handleToggleStatus(access.collection.id, access.collection.status)}
                            className="text-xs text-gray-500 hover:text-neon-cyan transition-colors"
                          >
                            {access.collection.status === 'closed' ? 'Открыть доступ' : 'Закрыть доступ'}
                          </button>
                        </div>

                        {access.comment && (
                          <p className="text-xs text-gray-400 bg-dark-bg rounded-md px-3 py-2 mb-3">
                            💬 {access.comment}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyLink(access.accessToken)}
                            className="btn-neon text-xs px-3 py-2"
                          >
                            {copiedToken === access.accessToken ? '✓ Скопировано' : 'Копировать ссылку'}
                          </button>
                          <a
                            href={`/share/${access.accessToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-gray-400 hover:text-neon-cyan transition-colors px-3 py-2"
                          >
                            Открыть →
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Нет назначенных коллекций</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
