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
  accessToken: string;
  createdAt: string;
  access: AccessInfo[];
}

interface ClientsManagerProps {
  clients: ClientInfo[];
  collections: CollectionInfo[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Ожидает', color: 'text-ink-300' },
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
  const [copiedClientToken, setCopiedClientToken] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [addCollectionTo, setAddCollectionTo] = useState('');
  const [addLoading, setAddLoading] = useState(false);

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

  const handleCopyClientLink = (token: string) => {
    const url = `${window.location.origin}/client/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedClientToken(token);
    setTimeout(() => setCopiedClientToken(''), 2000);
  };

  const handleAddCollection = async (clientId: string) => {
    if (!addCollectionTo) return;
    setAddLoading(true);
    try {
      const res = await fetch('/api/admin/clients/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, collectionId: addCollectionTo }),
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
      setAddLoading(false);
      setAddCollectionTo('');
    }
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
    <div className="space-y-4 sm:space-y-6">
      {/* Create client */}
      <div className="glass rounded-xl p-4 sm:p-6">
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
                <label className="block text-sm text-ink-200 mb-2">Имя клиента *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-ink-800 border border-border-default rounded-lg px-4 py-3 text-ink-50 focus:outline-none focus:border-accent/40"
                  placeholder="Иван Иванов"
                />
              </div>

              <div>
                <label className="block text-sm text-ink-200 mb-2">Email (опционально)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-ink-800 border border-border-default rounded-lg px-4 py-3 text-ink-50 focus:outline-none focus:border-accent/40"
                  placeholder="client@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-ink-200 mb-2">Назначить коллекцию</label>
              <select
                value={selectedCollection}
                onChange={(e) => setSelectedCollection(e.target.value)}
                className="w-full bg-ink-800 border border-border-default rounded-lg px-4 py-3 text-ink-50 focus:outline-none focus:border-accent/40"
              >
                <option value="">Без коллекции (можно добавить позже)</option>
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
        <div className="glass rounded-xl p-8 sm:p-16 text-center">
          <p className="text-ink-200">Нет клиентов</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => {
            const isExpanded = expandedClient === client.id;
            const availableCollections = collections.filter(
              (c) => !client.access.some((a) => a.collection.id === c.id)
            );
            return (
              <div key={client.id} className="glass rounded-xl p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-ink-50 truncate">{client.name}</h3>
                    {client.email && <p className="text-sm text-ink-300 truncate">{client.email}</p>}
                  </div>
                  <span className="text-xs text-ink-300 flex-shrink-0 ml-2">
                    {new Date(client.createdAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                {/* Client portal link */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-4">
                  <button
                    onClick={() => handleCopyClientLink(client.accessToken)}
                    className="btn-neon text-xs px-3 py-2 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {copiedClientToken === client.accessToken ? '✓ Скопировано' : 'Ссылка для клиента'}
                  </button>
                  <a
                    href={`/client/${client.accessToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink-200 hover:text-accent transition-colors px-3 py-2"
                  >
                    Открыть портал →
                  </a>
                  <span className="text-xs text-ink-300">
                    {client.access.length} {client.access.length === 1 ? 'коллекция' : client.access.length < 5 ? 'коллекции' : 'коллекций'}
                  </span>
                </div>

                {/* Collections list */}
                {client.access.length > 0 ? (
                  <div className="space-y-3">
                    {client.access.map((access) => {
                      const status = statusConfig[access.status] || statusConfig.pending;
                      return (
                        <div key={access.id} className="bg-ink-800 border border-border-default rounded-lg p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-sm text-ink-100 truncate">{access.collection.title}</span>
                              <span className={`text-xs ${status.color} flex-shrink-0`}>● {status.label}</span>
                            </div>
                            <button
                              onClick={() => handleToggleStatus(access.collection.id, access.collection.status)}
                              className="text-xs text-ink-300 hover:text-accent transition-colors flex-shrink-0"
                            >
                              {access.collection.status === 'closed' ? 'Открыть доступ' : 'Закрыть доступ'}
                            </button>
                          </div>

                          {access.comment && (
                            <p className="text-xs text-ink-200 bg-ink-900 rounded-md px-3 py-2 mb-3">
                              {access.comment}
                            </p>
                          )}

                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <button
                              onClick={() => handleCopyLink(access.accessToken)}
                              className="btn-neon text-xs px-3 py-2"
                            >
                              {copiedToken === access.accessToken ? '✓ Скопировано' : 'Копировать прямую ссылку'}
                            </button>
                            <a
                              href={`/share/${access.accessToken}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-ink-200 hover:text-accent transition-colors px-3 py-2"
                            >
                              Открыть →
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-ink-300 mb-3">Нет назначенных коллекций</p>
                )}

                {/* Add collection */}
                {isExpanded && availableCollections.length > 0 && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-2">
                    <select
                      value={addCollectionTo}
                      onChange={(e) => setAddCollectionTo(e.target.value)}
                      className="flex-1 bg-ink-800 border border-border-default rounded-lg px-3 py-2 text-sm text-ink-50 focus:outline-none focus:border-accent/40"
                    >
                      <option value="">Выбрать коллекцию...</option>
                      {availableCollections.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleAddCollection(client.id)}
                      disabled={!addCollectionTo || addLoading}
                      className="btn-neon text-xs px-4 py-2"
                    >
                      {addLoading ? 'Добавление...' : '+ Добавить'}
                    </button>
                  </div>
                )}

                {/* Toggle add form */}
                {availableCollections.length > 0 && (
                  <button
                    onClick={() => {
                      setExpandedClient(isExpanded ? null : client.id);
                      setAddCollectionTo('');
                    }}
                    className="mt-3 text-xs text-accent hover:text-accent-bright transition-colors"
                  >
                    {isExpanded ? '− Скрыть' : '+ Добавить коллекцию'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
