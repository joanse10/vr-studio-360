'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const HotspotEditor = dynamic(() => import('@/components/HotspotEditor'), { ssr: false });
const InfoHotspotEditor = dynamic(() => import('@/components/InfoHotspotEditor'), { ssr: false });

interface RoomHotspot {
  id: string;
  yaw: number;
  pitch: number;
  toRoomId: string;
  label: string;
  icon: string;
}

interface RoomInfoHotspot {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string;
  yaw: number;
  pitch: number;
}

interface RoomData {
  id: string;
  name: string;
  order: number;
  panoramaUrl: string;
  hotspots: RoomHotspot[];
  infoHotspots: RoomInfoHotspot[];
}

interface BeforeAfterData {
  id: string;
  title: string;
  beforeImage: string;
  afterImage: string;
}

interface ShareLinkData {
  id: string;
  token: string;
  type: string;
  label: string;
}

interface CollectionData {
  id: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  coverImage: string | null;
  createdAt: string;
  rooms: RoomData[];
  beforeAfters: BeforeAfterData[];
  shareLinks: ShareLinkData[];
}

export default function CollectionEditor({ collection }: { collection: CollectionData }) {
  const router = useRouter();
  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description);
  const [status, setStatus] = useState(collection.status);
  const [coverImage, setCoverImage] = useState(collection.coverImage || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedToken, setCopiedToken] = useState('');
  const [showShareForm, setShowShareForm] = useState(false);
  const [shareLabel, setShareLabel] = useState('');
  const [uploading, setUploading] = useState(false);

  const [showRoomForm, setShowRoomForm] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPanorama, setNewRoomPanorama] = useState('');
  const [rooms, setRooms] = useState<RoomData[]>(collection.rooms);

  const [showBaForm, setShowBaForm] = useState(false);
  const [newBaTitle, setNewBaTitle] = useState('');
  const [newBaBefore, setNewBaBefore] = useState('');
  const [newBaAfter, setNewBaAfter] = useState('');
  const [beforeAfters, setBeforeAfters] = useState<BeforeAfterData[]>(collection.beforeAfters);
  const [expandedRoom, setExpandedRoom] = useState<string | null>(null);
  const [baLoading, setBaLoading] = useState(false);
  const [baError, setBaError] = useState('');
  const baBeforeInputRef = useRef<HTMLInputElement>(null);
  const baAfterInputRef = useRef<HTMLInputElement>(null);

  // Info hotspot section toggle
  const [showInfoForm, setShowInfoForm] = useState<string | null>(null);

  const uploadFile = async (file: File, type: 'panorama' | 'image'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) throw new Error('Upload failed');
    const data = await res.json();
    return data.url;
  };

  const handleUpload = async (
    file: File,
    type: 'panorama' | 'image',
    callback: (url: string) => void
  ) => {
    setUploading(true);
    try {
      const url = await uploadFile(file, type);
      callback(url);
    } catch {
      setError('Ошибка загрузки файла');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/collections/${collection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, status, coverImage: coverImage || null }),
        cache: 'no-store',
      });

      if (res.ok) {
        setError('');
      } else {
        const data = await res.json();
        setError(data.error || 'Ошибка сохранения');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить коллекцию?')) return;

    try {
      await fetch(`/api/admin/collections/${collection.id}`, { method: 'DELETE' });
      router.push('/admin/dashboard');
    } catch {
      setError('Ошибка удаления');
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
  };

  const handleCreateShareLink = async () => {
    try {
      const res = await fetch(`/api/admin/collections/${collection.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: shareLabel || 'Новая ссылка' }),
      });

      if (res.ok) {
        setShareLabel('');
        setShowShareForm(false);
        router.refresh();
      }
    } catch {
      setError('Ошибка создания ссылки');
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomName || !newRoomPanorama) {
      setError('Введите название и загрузите панораму');
      return;
    }

    try {
      const res = await fetch(`/api/admin/collections/${collection.id}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName, panoramaUrl: newRoomPanorama }),
      });

      if (res.ok) {
        const room = await res.json();
        setRooms([...rooms, room]);
        setNewRoomName('');
        setNewRoomPanorama('');
        setShowRoomForm(false);
        setError('');
      } else {
        const data = await res.json();
        setError(data.error || 'Ошибка создания комнаты');
      }
    } catch {
      setError('Ошибка создания комнаты');
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Удалить комнату?')) return;

    try {
      await fetch(`/api/admin/collections/${collection.id}/rooms/${roomId}`, { method: 'DELETE' });
      setRooms(rooms.filter((r) => r.id !== roomId));
    } catch {
      setError('Ошибка удаления комнаты');
    }
  };

  const handleUpdateRoomPanorama = async (roomId: string, panoramaUrl: string) => {
    try {
      await fetch(`/api/admin/collections/${collection.id}/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panoramaUrl }),
      });
      setRooms(rooms.map((r) => (r.id === roomId ? { ...r, panoramaUrl } : r)));
    } catch {
      setError('Ошибка обновления панорамы');
    }
  };

  const handleAddBa = async () => {
    if (!newBaBefore || !newBaAfter) {
      setBaError('Загрузите оба изображения (До и После)');
      return;
    }

    setBaLoading(true);
    setBaError('');

    try {
      const payload = {
        title: newBaTitle,
        beforeImage: newBaBefore,
        afterImage: newBaAfter,
      };
      const res = await fetch(`/api/admin/collections/${collection.id}/before-after`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      if (res.ok) {
        const ba = await res.json();
        setBeforeAfters([...beforeAfters, ba]);
        setNewBaTitle('');
        setNewBaBefore('');
        setNewBaAfter('');
        setShowBaForm(false);
        setBaError('');
      } else {
        const data = await res.json();
        setBaError(data.error || 'Ошибка создания пары');
      }
    } catch {
      setBaError('Ошибка соединения с сервером');
    } finally {
      setBaLoading(false);
    }
  };

  const handleDeleteBa = async (baId: string) => {
    if (!confirm('Удалить пару до/после?')) return;

    try {
      await fetch(`/api/admin/collections/${collection.id}/before-after/${baId}`, { method: 'DELETE' });
      setBeforeAfters(beforeAfters.filter((ba) => ba.id !== baId));
    } catch {
      setError('Ошибка удаления пары');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-ink-50 mb-1 tracking-tight truncate">Редактирование</h1>
          <p className="text-sm text-ink-300 truncate">/{collection.slug}</p>
        </div>
        <div className="flex gap-3 flex-shrink-0">
          <Link href={`/collection/${collection.slug}`} target="_blank" className="text-sm text-accent hover:underline">
            Открыть →
          </Link>
          <button type="button" onClick={handleDelete} className="text-sm text-red-400 hover:text-red-300">
            Удалить
          </button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {uploading && (
        <div className="text-sm text-accent bg-accent/10 border border-accent/15 rounded-lg px-4 py-3">
          Загрузка файла...
        </div>
      )}

      {/* Basic info */}
      <div className="glass rounded-xl p-4 sm:p-6 space-y-4">
        <h2 className="text-base font-semibold text-ink-50">Основная информация</h2>

        <div>
          <label className="block text-sm text-ink-200 mb-2">Название</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-ink-800 border border-border-default rounded-lg px-4 py-3 text-ink-50 focus:outline-none focus:border-accent/40"
          />
        </div>

        <div>
          <label className="block text-sm text-ink-200 mb-2">Описание</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-ink-800 border border-border-default rounded-lg px-4 py-3 text-ink-50 focus:outline-none focus:border-accent/40 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm text-ink-200 mb-2">Тип доступа</label>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {[
              { value: 'public', label: 'Публичная' },
              { value: 'private', label: 'Приватная' },
              { value: 'closed', label: 'Закрыта' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatus(opt.value)}
                className={`flex-1 p-3 rounded-lg border text-sm transition-all ${
                  status === opt.value
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-border-default bg-ink-800 text-ink-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-ink-200 mb-2">Обложка</label>
          {coverImage && (
            <div className="mb-3">
              <img
                src={coverImage}
                alt="Обложка"
                className="w-full h-40 object-cover rounded-lg border border-border-default"
              />
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              className="flex-1 bg-ink-800 border border-border-default rounded-lg px-4 py-3 text-ink-50 focus:outline-none focus:border-accent/40"
              placeholder="URL или загрузите файл"
            />
            <label className="btn-neon cursor-pointer text-sm whitespace-nowrap">
              Загрузить
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file, 'image', setCoverImage);
                }}
              />
            </label>
          </div>
        </div>

        <button type="button" onClick={handleSave} disabled={loading} className="btn-neon">
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>

      {/* Rooms */}
      <div className="glass rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink-50">Комнаты ({rooms.length})</h2>
          <button type="button" onClick={() => setShowRoomForm(!showRoomForm)} className="btn-neon text-sm">
            + Комната
          </button>
        </div>

        {showRoomForm && (
          <div className="bg-ink-800 border border-border-default rounded-lg p-4 space-y-3 mb-4">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              className="w-full bg-ink-900 border border-border-default rounded-lg px-3 py-2 text-ink-50 text-sm focus:outline-none focus:border-accent/40"
              placeholder="Название комнаты (Гостиная, Кухня...)"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={newRoomPanorama}
                onChange={(e) => setNewRoomPanorama(e.target.value)}
                className="flex-1 bg-ink-900 border border-border-default rounded-lg px-3 py-2 text-ink-50 text-sm focus:outline-none focus:border-accent/40"
                placeholder="URL 360° панорамы или загрузите файл"
              />
              <label className="btn-neon cursor-pointer text-sm whitespace-nowrap">
                Загрузить
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(file, 'panorama', setNewRoomPanorama);
                  }}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleAddRoom} className="btn-neon text-sm">
                Добавить комнату
              </button>
              <button
                onClick={() => { setShowRoomForm(false); setNewRoomName(''); setNewRoomPanorama(''); }}
                className="text-ink-200 hover:text-ink-50 text-sm px-4 py-3"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {rooms.length === 0 ? (
          <p className="text-sm text-ink-300">Нет комнат</p>
        ) : (
          <div className="space-y-3">
            {rooms.map((room, idx) => (
              <div key={room.id} className="bg-ink-800 border border-border-default rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-xs text-ink-300">#{idx + 1}</span>
                    <p className="text-sm text-ink-50 mt-1">{room.name}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteRoom(room.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Удалить
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <input
                    type="text"
                    value={room.panoramaUrl}
                    readOnly
                    className="w-full bg-ink-900 border border-border-default rounded-lg px-3 py-2 text-ink-200 text-xs focus:outline-none truncate"
                  />
                  <label className="btn-neon cursor-pointer text-xs whitespace-nowrap px-3 py-2">
                    Заменить
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file, 'panorama', (url) => handleUpdateRoomPanorama(room.id, url));
                      }}
                    />
                  </label>
                </div>

                {rooms.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <button
                      onClick={() => setExpandedRoom(expandedRoom === room.id ? null : room.id)}
                      className="text-xs text-accent hover:text-accent-bright transition-colors"
                    >
                      {expandedRoom === room.id ? '▼ Скрыть переходы' : '▶ Настроить переходы (hotspots)'}
                    </button>
                  </div>
                )}

                {expandedRoom === room.id && rooms.length > 1 && (
                  <div className="mt-4">
                    <HotspotEditor
                      room={room}
                      rooms={rooms}
                      collectionId={collection.id}
                      onHotspotAdded={() => router.refresh()}
                      onHotspotRemoved={() => router.refresh()}
                    />
                  </div>
                )}

                {/* Info Hotspots */}
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <button
                    onClick={() => setShowInfoForm(showInfoForm === room.id ? null : room.id)}
                    className="text-xs text-accent hover:text-accent-bright transition-colors mb-2"
                  >
                    {showInfoForm === room.id ? '▼ Скрыть' : '▶ Информационные метки'} ({room.infoHotspots?.length || 0})
                  </button>

                  {showInfoForm === room.id && (
                    <InfoHotspotEditor
                      room={room}
                      collectionId={collection.id}
                      onHotspotChanged={() => router.refresh()}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Before/After */}
      <div className="glass rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink-50">До / После ({beforeAfters.length})</h2>
          <button type="button" onClick={() => setShowBaForm(!showBaForm)} className="btn-neon text-sm">
            + Пара
          </button>
        </div>

        {showBaForm && (
          <div className="bg-ink-800 border border-border-default rounded-lg p-4 space-y-3 mb-4">
            {baError && (
              <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {baError}
              </div>
            )}
            <input
              type="text"
              value={newBaTitle}
              onChange={(e) => setNewBaTitle(e.target.value)}
              className="w-full bg-ink-900 border border-border-default rounded-lg px-3 py-2 text-ink-50 text-sm focus:outline-none focus:border-accent/40"
              placeholder="Заголовок (опционально)"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-ink-300 mb-1">До</label>
                {newBaBefore && (
                  <img src={newBaBefore} alt="До" className="w-full h-24 object-cover rounded-md mb-2" />
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBaBefore}
                    onChange={(e) => setNewBaBefore(e.target.value)}
                    className="flex-1 bg-ink-900 border border-border-default rounded-lg px-2 py-2 text-ink-50 text-xs focus:outline-none focus:border-accent/40"
                    placeholder="URL"
                  />
                  <button
                    type="button"
                    onClick={() => baBeforeInputRef.current?.click()}
                    className="btn-neon cursor-pointer text-xs whitespace-nowrap px-2 py-2"
                  >
                    ↑
                  </button>
                  <input
                    ref={baBeforeInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, 'image', setNewBaBefore);
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-ink-300 mb-1">После</label>
                {newBaAfter && (
                  <img src={newBaAfter} alt="После" className="w-full h-24 object-cover rounded-md mb-2" />
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newBaAfter}
                    onChange={(e) => setNewBaAfter(e.target.value)}
                    className="flex-1 bg-ink-900 border border-border-default rounded-lg px-2 py-2 text-ink-50 text-xs focus:outline-none focus:border-accent/40"
                    placeholder="URL"
                  />
                  <button
                    type="button"
                    onClick={() => baAfterInputRef.current?.click()}
                    className="btn-neon cursor-pointer text-xs whitespace-nowrap px-2 py-2"
                  >
                    ↑
                  </button>
                  <input
                    ref={baAfterInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, 'image', setNewBaAfter);
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => { console.log('Add BA clicked'); handleAddBa(); }} disabled={baLoading || uploading} className="btn-neon text-sm px-6 py-3">
                {baLoading ? 'Добавление...' : uploading ? 'Загрузка...' : 'Добавить пару'}
              </button>
              <button
                type="button"
                onClick={() => { setShowBaForm(false); setNewBaTitle(''); setNewBaBefore(''); setNewBaAfter(''); setBaError(''); }}
                className="text-ink-200 hover:text-ink-50 text-sm px-4 py-3"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {beforeAfters.length === 0 ? (
          <p className="text-sm text-ink-300">Нет пар до/после</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {beforeAfters.map((ba) => (
              <div key={ba.id} className="bg-ink-800 border border-border-default rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  {ba.title && <p className="text-xs text-ink-200">{ba.title}</p>}
                  <button
                    onClick={() => handleDeleteBa(ba.id)}
                    className="text-xs text-red-400 hover:text-red-300 ml-auto"
                  >
                    Удалить
                  </button>
                </div>
                <div className="flex gap-2">
                  <img src={ba.beforeImage} alt="До" className="w-1/2 h-24 object-cover rounded-md" />
                  <img src={ba.afterImage} alt="После" className="w-1/2 h-24 object-cover rounded-md" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share links */}
      <div className="glass rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-ink-50">Ссылки для шеринга</h2>
          <button type="button" onClick={() => setShowShareForm(!showShareForm)} className="btn-neon text-sm">
            + Ссылка
          </button>
        </div>

        {showShareForm && (
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <input
              type="text"
              value={shareLabel}
              onChange={(e) => setShareLabel(e.target.value)}
              className="flex-1 bg-ink-800 border border-border-default rounded-lg px-4 py-2 text-ink-50 text-sm focus:outline-none focus:border-accent/40"
              placeholder="Название ссылки (например: для Facebook)"
            />
            <button type="button" onClick={handleCreateShareLink} className="btn-neon text-sm">
              Создать
            </button>
          </div>
        )}

        {collection.shareLinks.length === 0 ? (
          <p className="text-sm text-ink-300">Нет ссылок</p>
        ) : (
          <div className="space-y-3">
            {collection.shareLinks.map((link) => (
              <div key={link.id} className="bg-ink-800 border border-border-default rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-ink-50">{link.label}</p>
                  <p className="text-xs text-ink-300">/share/{link.token.substring(0, 16)}...</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopyLink(link.token)}
                    className="btn-neon text-xs px-3 py-2"
                  >
                    {copiedToken === link.token ? '✓' : 'Копировать'}
                  </button>
                  <a
                    href={`/share/${link.token}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink-200 hover:text-accent px-3 py-2"
                  >
                    Открыть →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
