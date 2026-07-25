'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';

interface RoomForm {
  name: string;
  panoramaUrl: string;
}

interface BeforeAfterForm {
  title: string;
  beforeImage: string;
  afterImage: string;
}

export default function NewCollectionPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('private');
  const [coverImage, setCoverImage] = useState('');
  const [rooms, setRooms] = useState<RoomForm[]>([{ name: '', panoramaUrl: '' }]);
  const [beforeAfters, setBeforeAfters] = useState<BeforeAfterForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

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

  const handleFileUpload = async (
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

  const addRoom = () => {
    setRooms([...rooms, { name: '', panoramaUrl: '' }]);
  };

  const removeRoom = (idx: number) => {
    setRooms(rooms.filter((_, i) => i !== idx));
  };

  const updateRoom = (idx: number, field: keyof RoomForm, value: string) => {
    setRooms(rooms.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const addBeforeAfter = () => {
    setBeforeAfters([...beforeAfters, { title: '', beforeImage: '', afterImage: '' }]);
  };

  const removeBeforeAfter = (idx: number) => {
    setBeforeAfters(beforeAfters.filter((_, i) => i !== idx));
  };

  const updateBeforeAfter = (idx: number, field: keyof BeforeAfterForm, value: string) => {
    setBeforeAfters(beforeAfters.map((ba, i) => (i === idx ? { ...ba, [field]: value } : ba)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const validRooms = rooms.filter((r) => r.name && r.panoramaUrl);
      const validBA = beforeAfters.filter((ba) => ba.beforeImage && ba.afterImage);

      const res = await fetch('/api/admin/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          status,
          coverImage: coverImage || null,
          rooms: validRooms,
          beforeAfters: validBA,
        }),
      });

      if (res.ok) {
        router.push('/admin/dashboard');
      } else {
        const data = await res.json();
        setError(data.error || 'Ошибка создания');
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold gradient-text mb-2">Новая коллекция</h1>
        <p className="text-sm text-gray-400">Создание 360° тура</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {error && (
          <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Basic info */}
        <div className="glass rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Основная информация</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Название проекта *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-cyan/50 transition-all"
              placeholder="Например: Загородный дом"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-cyan/50 transition-all resize-none"
              placeholder="Краткое описание проекта..."
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Тип доступа</label>
            <div className="flex gap-3">
              {[
                { value: 'public', label: 'Публичная', desc: 'Видна всем' },
                { value: 'private', label: 'Приватная', desc: 'Только по ссылке' },
                { value: 'closed', label: 'Закрыта', desc: 'Недоступна' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={`flex-1 p-3 rounded-lg border text-left transition-all ${
                    status === opt.value
                      ? 'border-neon-cyan/50 bg-neon-cyan/10'
                      : 'border-dark-border bg-dark-card hover:border-neon-cyan/20'
                  }`}
                >
                  <p className={`text-sm font-medium ${status === opt.value ? 'text-neon-cyan' : 'text-gray-300'}`}>
                    {opt.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Обложка (URL)</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="flex-1 bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neon-cyan/50 transition-all"
                placeholder="https://..."
              />
              <label className="btn-neon cursor-pointer text-sm whitespace-nowrap">
                Загрузить
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'image', setCoverImage);
                  }}
                />
              </label>
            </div>
            {uploading && <p className="text-xs text-neon-cyan mt-2">Загрузка...</p>}
          </div>
        </div>

        {/* Rooms */}
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Комнаты (360° панорамы)</h2>
            <button type="button" onClick={addRoom} className="btn-neon text-sm">
              + Комната
            </button>
          </div>

          {rooms.map((room, idx) => (
            <div key={idx} className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Комната {idx + 1}</span>
                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRoom(idx)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Удалить
                  </button>
                )}
              </div>

              <input
                type="text"
                value={room.name}
                onChange={(e) => updateRoom(idx, 'name', e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan/50"
                placeholder="Название комнаты (Гостиная, Кухня...)"
              />

              <div className="flex gap-2">
                <input
                  type="text"
                  value={room.panoramaUrl}
                  onChange={(e) => updateRoom(idx, 'panoramaUrl', e.target.value)}
                  className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan/50"
                  placeholder="URL 360° панорамы (equirectangular)"
                />
                <label className="btn-neon cursor-pointer text-sm whitespace-nowrap">
                  Загрузить
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'panorama', (url) => updateRoom(idx, 'panoramaUrl', url));
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Before/After */}
        <div className="glass rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">До / После</h2>
            <button type="button" onClick={addBeforeAfter} className="btn-neon text-sm">
              + Пара
            </button>
          </div>

          {beforeAfters.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Нет пар до/после</p>
          )}

          {beforeAfters.map((ba, idx) => (
            <div key={idx} className="bg-dark-card border border-dark-border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Пара {idx + 1}</span>
                <button
                  type="button"
                  onClick={() => removeBeforeAfter(idx)}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Удалить
                </button>
              </div>

              <input
                type="text"
                value={ba.title}
                onChange={(e) => updateBeforeAfter(idx, 'title', e.target.value)}
                className="w-full bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan/50"
                placeholder="Заголовок (опционально)"
              />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">До</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ba.beforeImage}
                      onChange={(e) => updateBeforeAfter(idx, 'beforeImage', e.target.value)}
                      className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-neon-cyan/50"
                      placeholder="URL"
                    />
                    <label className="btn-neon cursor-pointer text-xs whitespace-nowrap px-2 py-2">
                      ↑
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'image', (url) => updateBeforeAfter(idx, 'beforeImage', url));
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">После</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ba.afterImage}
                      onChange={(e) => updateBeforeAfter(idx, 'afterImage', e.target.value)}
                      className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-neon-cyan/50"
                      placeholder="URL"
                    />
                    <label className="btn-neon cursor-pointer text-xs whitespace-nowrap px-2 py-2">
                      ↑
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'image', (url) => updateBeforeAfter(idx, 'afterImage', url));
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={loading} className="btn-neon">
            {loading ? 'Создание...' : 'Создать коллекцию'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/dashboard')}
            className="text-gray-400 hover:text-white text-sm px-4 py-3"
          >
            Отмена
          </button>
        </div>
      </form>
    </AdminLayout>
  );
}
