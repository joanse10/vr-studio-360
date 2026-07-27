'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

declare global {
  interface Window {
    pannellum: any;
  }
}

interface Hotspot {
  id: string;
  yaw: number;
  pitch: number;
  toRoomId: string;
  label: string;
  icon: string;
}

interface Room {
  id: string;
  name: string;
  panoramaUrl: string;
  hotspots: Hotspot[];
}

interface HotspotEditorProps {
  room: Room;
  rooms: Room[];
  collectionId: string;
  onHotspotAdded: () => void;
  onHotspotRemoved: () => void;
}

export default function HotspotEditor({
  room,
  rooms,
  collectionId,
  onHotspotAdded,
  onHotspotRemoved,
}: HotspotEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [pannellumLoaded, setPannellumLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [pendingClick, setPendingClick] = useState<{ yaw: number; pitch: number } | null>(null);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [hotspotLabel, setHotspotLabel] = useState('');
  const [hotspots, setHotspots] = useState<Hotspot[]>(room.hotspots);
  const [saving, setSaving] = useState(false);

  const otherRooms = rooms.filter((r) => r.id !== room.id);

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

    const hotSpots = hotspots.map((h) => ({
      id: h.id,
      pitch: h.pitch,
      yaw: h.yaw,
      type: 'scene',
      text: h.label,
      sceneId: h.toRoomId,
      cssClass: 'custom-hotspot',
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
            setPendingClick({ yaw: coords[1], pitch: coords[0] });
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
  }, [editMode]);

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
    setHotspots(room.hotspots);
  }, [room]);

  const handleSaveHotspot = async () => {
    if (!pendingClick || !selectedRoom) return;

    setSaving(true);
    try {
      const targetRoom = rooms.find((r) => r.id === selectedRoom);
      const label = hotspotLabel || `→ ${targetRoom?.name || 'Комната'}`;

      const res = await fetch(`/api/admin/collections/${collectionId}/rooms/${room.id}/hotspots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toRoomId: selectedRoom,
          yaw: pendingClick.yaw,
          pitch: pendingClick.pitch,
          label,
        }),
      });

      if (res.ok) {
        const newHotspot = await res.json();
        setHotspots([...hotspots, newHotspot]);
        setPendingClick(null);
        setSelectedRoom('');
        setHotspotLabel('');
        onHotspotAdded();
        createViewer();
      }
    } catch {
      // error
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHotspot = async (hotspotId: string) => {
    try {
      await fetch(`/api/admin/collections/${collectionId}/rooms/${room.id}/hotspots/${hotspotId}`, {
        method: 'DELETE',
      });
      setHotspots(hotspots.filter((h) => h.id !== hotspotId));
      onHotspotRemoved();
      createViewer();
    } catch {
      // error
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between editor-header-mobile">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink-50">Hotspots — переходы</h3>
          <p className="text-xs text-ink-300 mt-1 hidden sm:block">
            Включите режим, кликните по панораме — появится стрелка-переход
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
          {editMode ? '✓ Режим' : '✎ Переходы'}
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
              {pendingClick ? '✓ Точка выбрана — выберите комнату ниже' : 'Кликните по панораме для установки стрелки'}
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

          <div>
            <label className="block text-xs text-ink-300 mb-2">Куда ведёт стрелка</label>
            <div className="flex flex-wrap gap-2">
              {otherRooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoom(r.id)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                    selectedRoom === r.id
                      ? 'border-accent/40 bg-accent/10 text-accent'
                      : 'border-border-default bg-ink-800 text-ink-100 hover:border-border-bright'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-ink-300 mb-2">Подпись при наведении (опционально)</label>
            <input
              type="text"
              value={hotspotLabel}
              onChange={(e) => setHotspotLabel(e.target.value)}
              className="w-full bg-ink-800 border border-border-default rounded-lg px-3 py-2 text-ink-50 text-sm focus:outline-none focus:border-accent/40"
              placeholder={`Например: Перейти в ${otherRooms.find((r) => r.id === selectedRoom)?.name || 'комнату'}`}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSaveHotspot}
              disabled={!selectedRoom || saving}
              className="btn-neon text-sm"
            >
              {saving ? 'Сохранение...' : 'Установить стрелку'}
            </button>
            <button
              onClick={() => { setPendingClick(null); setSelectedRoom(''); setHotspotLabel(''); }}
              className="text-ink-200 hover:text-ink-50 text-sm px-4 py-3"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {hotspots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-ink-300">Установленные переходы:</p>
          {hotspots.map((h) => {
            const targetRoom = rooms.find((r) => r.id === h.toRoomId);
            return (
              <div key={h.id} className="bg-ink-800 border border-border-default rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <span className="text-accent text-sm">→</span>
                  </div>
                  <div>
                    <p className="text-sm text-ink-50">{h.label}</p>
                    <p className="text-xs text-ink-300">
                      → {targetRoom?.name || 'неизвестно'} · yaw: {h.yaw.toFixed(1)}°, pitch: {h.pitch.toFixed(1)}°
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteHotspot(h.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Удалить
                </button>
              </div>
            );
          })}
        </div>
      )}

      {hotspots.length === 0 && !pendingClick && (
        <div className="glass rounded-xl p-6 text-center">
          <p className="text-sm text-ink-300">
            Переходы не установлены. Включите «Расставить переходы» и кликните по панораме.
          </p>
        </div>
      )}
    </div>
  );
}
