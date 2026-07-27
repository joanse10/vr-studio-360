'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    pannellum: any;
  }
}

interface InfoHotspot {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string;
  yaw: number;
  pitch: number;
}

interface Room {
  id: string;
  name: string;
  panoramaUrl: string;
  infoHotspots: InfoHotspot[];
}

interface InfoHotspotEditorProps {
  room: Room;
  collectionId: string;
  onHotspotChanged: () => void;
}

export default function InfoHotspotEditor({
  room,
  collectionId,
  onHotspotChanged,
}: InfoHotspotEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [pannellumLoaded, setPannellumLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [pendingClick, setPendingClick] = useState<{ yaw: number; pitch: number } | null>(null);
  const [hotspots, setHotspots] = useState<InfoHotspot[]>(room.infoHotspots || []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [repositionId, setRepositionId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('Купить');

  const loadPannellum = useCallback(() => {
    return new Promise<void>((resolve) => {
      if (window.pannellum) {
        setPannellumLoaded(true);
        resolve();
        return;
      }

      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css';
      document.head.appendChild(cssLink);

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js';
      script.async = true;
      script.onload = () => {
        setPannellumLoaded(true);
        resolve();
      };
      document.body.appendChild(script);
    });
  }, []);

  const createViewer = useCallback(() => {
    if (!containerRef.current || !window.pannellum) return;

    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
    }

    const hotSpots = hotspots.map((ih) => ({
      id: ih.id,
      pitch: ih.pitch,
      yaw: ih.yaw,
      type: 'info',
      text: ih.title,
      cssClass: 'info-hotspot',
    }));

    viewerRef.current = window.pannellum.viewer(containerRef.current, {
      default: {
        firstScene: room.id,
        sceneFadeDuration: 800,
        autoLoad: true,
        hotSpotDebug: true,
      },
      scenes: {
        [room.id]: {
          title: room.name,
          panorama: room.panoramaUrl,
          hfov: 100,
          pitch: 0,
          yaw: 0,
          hotSpots,
        },
      },
    });

    viewerRef.current.on('load', () => {
      setLoading(false);
    });
  }, [room, hotspots]);

  useEffect(() => {
    if (!editMode || !containerRef.current) return;

    const container = containerRef.current;
    let mouseDownPos: { x: number; y: number } | null = null;

    const handleMouseDown = (e: MouseEvent | TouchEvent) => {
      const point = 'touches' in e ? e.touches[0] : e;
      mouseDownPos = { x: point.clientX, y: point.clientY };
    };

    const handleMouseUp = (e: MouseEvent | TouchEvent) => {
      if (!mouseDownPos) return;
      const point = 'changedTouches' in e ? e.changedTouches[0] : e;
      const dx = Math.abs(point.clientX - mouseDownPos.x);
      const dy = Math.abs(point.clientY - mouseDownPos.y);
      mouseDownPos = null;

      if (dx > 5 || dy > 5) return;

      if (viewerRef.current && window.pannellum) {
        try {
          const coords = viewerRef.current.mouseEventToCoords(point);
          if (coords) {
            if (repositionId) {
              handleReposition(repositionId, coords[1], coords[0]);
            } else {
              setPendingClick({ yaw: coords[1], pitch: coords[0] });
            }
          }
        } catch {
          // ignore
        }
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleMouseDown, { passive: true });
    container.addEventListener('touchend', handleMouseUp, { passive: true });

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleMouseDown);
      container.removeEventListener('touchend', handleMouseUp);
    };
  }, [editMode, repositionId]);

  useEffect(() => {
    loadPannellum().then(() => {
      createViewer();
    });

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pannellumLoaded]);

  useEffect(() => {
    setHotspots(room.infoHotspots || []);
  }, [room]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');
      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setImageUrl(data.url);
    } catch {
      // error
    } finally {
      setUploading(false);
    }
  };

  const handleReposition = async (hotspotId: string, newYaw: number, newPitch: number) => {
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/rooms/${room.id}/info-hotspots/${hotspotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yaw: newYaw, pitch: newPitch }),
        cache: 'no-store',
      });

      if (res.ok) {
        const updated = await res.json();
        setHotspots(hotspots.map((h) => (h.id === hotspotId ? updated : h)));
        setRepositionId(null);
        onHotspotChanged();
        createViewer();
      }
    } catch {
      // error
    }
  };

  const handleUpdate = async (hotspotId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/rooms/${room.id}/info-hotspots/${hotspotId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          imageUrl: imageUrl || null,
          linkUrl: linkUrl || null,
          linkText,
        }),
        cache: 'no-store',
      });

      if (res.ok) {
        const updated = await res.json();
        setHotspots(hotspots.map((h) => (h.id === hotspotId ? updated : h)));
        setEditingId(null);
        setTitle('');
        setDescription('');
        setImageUrl('');
        setLinkUrl('');
        setLinkText('Купить');
        onHotspotChanged();
      }
    } catch {
      // error
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (ih: InfoHotspot) => {
    setEditingId(ih.id);
    setPendingClick(null);
    setRepositionId(null);
    setTitle(ih.title);
    setDescription(ih.description);
    setImageUrl(ih.imageUrl || '');
    setLinkUrl(ih.linkUrl || '');
    setLinkText(ih.linkText || 'Купить');
  };

  const handleSave = async () => {
    if (!pendingClick || !title) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/collections/${collectionId}/rooms/${room.id}/info-hotspots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          imageUrl: imageUrl || null,
          linkUrl: linkUrl || null,
          linkText,
          yaw: pendingClick.yaw,
          pitch: pendingClick.pitch,
        }),
        cache: 'no-store',
      });

      if (res.ok) {
        const newHotspot = await res.json();
        setHotspots([...hotspots, newHotspot]);
        setPendingClick(null);
        setTitle('');
        setDescription('');
        setImageUrl('');
        setLinkUrl('');
        setLinkText('Купить');
        onHotspotChanged();
        createViewer();
      }
    } catch {
      // error
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (hotspotId: string) => {
    try {
      await fetch(`/api/admin/collections/${collectionId}/rooms/${room.id}/info-hotspots/${hotspotId}`, {
        method: 'DELETE',
      });
      setHotspots(hotspots.filter((h) => h.id !== hotspotId));
      onHotspotChanged();
      createViewer();
    } catch {
      // error
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between editor-header-mobile">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-50">Информационные метки</h3>
          <p className="text-xs text-ink-300 mt-1 hidden sm:block">
            Включите режим, кликните по предмету на панораме — добавьте описание и ссылку
          </p>
        </div>
        <button
          onClick={() => {
            setEditMode(!editMode);
            setPendingClick(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
            editMode
              ? 'bg-accent/15 border border-accent/40 text-accent'
              : 'bg-ink-800 border border-border-default text-ink-100'
          }`}
        >
          {editMode ? '✓ Режим' : '✎ Метки'}
        </button>
      </div>

      <div className="relative w-full rounded-xl overflow-hidden accent-border editor-panorama-mobile" style={{ height: '300px' }}>
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: '300px', cursor: editMode ? 'crosshair' : 'default' }}
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink-900 z-50">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-3">
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin"></div>
              </div>
              <p className="text-accent text-xs">Загрузка...</p>
            </div>
          </div>
        )}

        {editMode && (
          <div className="absolute top-3 left-3 glass-strong rounded-lg px-3 py-2 z-30">
            <p className="text-xs text-accent">
              {repositionId
                ? '⟲ Кликните по новому месту на панораме'
                : pendingClick
                  ? '✓ Точка выбрана — заполните форму ниже'
                  : 'Кликните по предмету на панораме'}
            </p>
          </div>
        )}

        <div className="absolute top-3 left-1/2 -translate-x-1/2 glass-strong rounded-lg px-4 py-1.5 z-30">
          <span className="text-ink-50 text-sm font-medium tracking-tight">{room.name}</span>
        </div>
      </div>

      {pendingClick && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-300">Координаты:</span>
            <span className="text-xs text-accent font-mono">
              yaw: {pendingClick.yaw.toFixed(1)}°, pitch: {pendingClick.pitch.toFixed(1)}°
            </span>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-ink-800 border border-border-default rounded-lg px-3 py-2 text-ink-50 text-sm focus:outline-none focus:border-accent/40"
            placeholder="Название (Диван, Люстра, Картина...)"
          />

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-ink-800 border border-border-default rounded-lg px-3 py-2 text-ink-50 text-sm focus:outline-none focus:border-accent/40 resize-none"
            rows={2}
            placeholder="Описание (опционально)"
          />

          <div>
            <label className="block text-xs text-ink-300 mb-1">Изображение товара</label>
            {imageUrl && (
              <img src={imageUrl} alt="Preview" className="w-full h-24 object-cover rounded-md mb-2" />
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="flex-1 bg-ink-800 border border-border-default rounded-lg px-3 py-2 text-ink-200 text-xs focus:outline-none focus:border-accent/40"
                placeholder="URL изображения"
              />
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="btn-neon cursor-pointer text-xs whitespace-nowrap px-3 py-2"
              >
                {uploading ? '...' : '↑'}
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                }}
              />
            </div>
          </div>

          <div className="flex gap-2 link-inputs-mobile">
            <input
              type="text"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="flex-1 bg-ink-800 border border-border-default rounded-lg px-3 py-2 text-ink-200 text-xs focus:outline-none focus:border-accent/40"
              placeholder="Ссылка на магазин"
            />
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              className="w-24 bg-ink-800 border border-border-default rounded-lg px-3 py-2 text-ink-200 text-xs focus:outline-none focus:border-accent/40"
              placeholder="Текст"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!title || saving || uploading}
              className="btn-neon text-sm"
            >
              {saving ? 'Сохранение...' : uploading ? 'Загрузка...' : 'Установить метку'}
            </button>
            <button
              onClick={() => { setPendingClick(null); setTitle(''); setDescription(''); setImageUrl(''); setLinkUrl(''); setLinkText('Купить'); }}
              className="text-ink-200 hover:text-ink-50 text-sm px-4 py-3"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {hotspots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-ink-300">Установленные метки:</p>
          {hotspots.map((ih) => (
            <div key={ih.id} className="bg-ink-800 border border-border-default rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {ih.imageUrl && (
                    <img src={ih.imageUrl} alt={ih.title} className="w-10 h-10 rounded-md object-cover" />
                  )}
                  <div>
                    <p className="text-sm text-ink-50">{ih.title}</p>
                    <p className="text-xs text-ink-300">
                      yaw: {ih.yaw.toFixed(1)}°, pitch: {ih.pitch.toFixed(1)}°
                      {ih.linkUrl && ` · ${ih.linkUrl}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 hotspot-list-buttons-mobile">
                  <button
                    onClick={() => {
                      setEditMode(true);
                      setRepositionId(repositionId === ih.id ? null : ih.id);
                      setPendingClick(null);
                      setEditingId(null);
                    }}
                    className={`text-xs px-2 py-1 rounded transition-colors ${
                      repositionId === ih.id
                        ? 'bg-accent/20 text-accent border border-accent/40'
                        : 'text-ink-200 hover:text-accent'
                    }`}
                  >
                    {repositionId === ih.id ? 'Отмена' : '⟲'}
                  </button>
                  <button
                    onClick={() => startEdit(ih)}
                    className="text-xs text-ink-200 hover:text-accent"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDelete(ih.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {editingId === ih.id && (
                <div className="mt-3 pt-3 border-t border-border-subtle space-y-2">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-ink-900 border border-border-default rounded-lg px-3 py-2 text-ink-50 text-sm focus:outline-none focus:border-accent/40"
                    placeholder="Название"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-ink-900 border border-border-default rounded-lg px-3 py-2 text-ink-50 text-sm focus:outline-none focus:border-accent/40 resize-none"
                    rows={2}
                    placeholder="Описание"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="flex-1 bg-ink-900 border border-border-default rounded-lg px-3 py-2 text-ink-200 text-xs focus:outline-none focus:border-accent/40"
                      placeholder="URL изображения"
                    />
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="btn-neon cursor-pointer text-xs whitespace-nowrap px-3 py-2"
                    >
                      {uploading ? '...' : '↑'}
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                      }}
                    />
                  </div>
                  {imageUrl && (
                    <img src={imageUrl} alt="Preview" className="w-full h-20 object-cover rounded-md" />
                  )}
                  <div className="flex gap-2 link-inputs-mobile">
                    <input
                      type="text"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      className="flex-1 bg-ink-900 border border-border-default rounded-lg px-3 py-2 text-ink-200 text-xs focus:outline-none focus:border-accent/40"
                      placeholder="Ссылка на магазин"
                    />
                    <input
                      type="text"
                      value={linkText}
                      onChange={(e) => setLinkText(e.target.value)}
                      className="w-24 bg-ink-900 border border-border-default rounded-lg px-3 py-2 text-ink-200 text-xs focus:outline-none focus:border-accent/40"
                      placeholder="Текст"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleUpdate(ih.id)}
                      disabled={!title || saving || uploading}
                      className="btn-neon text-xs px-4 py-2"
                    >
                      {saving ? 'Сохранение...' : uploading ? 'Загрузка...' : 'Сохранить'}
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setTitle(''); setDescription(''); setImageUrl(''); setLinkUrl(''); setLinkText('Купить'); }}
                      className="text-ink-200 hover:text-ink-50 text-xs px-4 py-2"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hotspots.length === 0 && !pendingClick && (
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-sm text-ink-300">
            Метки не установлены. Включите «Расставить метки» и кликните по предмету на панораме.
          </p>
        </div>
      )}
    </div>
  );
}
