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

    const handleMouseDown = (e: MouseEvent) => {
      mouseDownPos = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!mouseDownPos) return;
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);
      mouseDownPos = null;

      if (dx > 5 || dy > 5) return;

      if (viewerRef.current && window.pannellum) {
        try {
          const coords = viewerRef.current.mouseEventToCoords(e);
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

    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Hotspots — переходы между комнатами</h3>
          <p className="text-xs text-gray-500 mt-1">
            Включите режим редактирования, кликните по панораме — появится стрелка-переход
          </p>
        </div>
        <button
          onClick={() => {
            setEditMode(!editMode);
            setPendingClick(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            editMode
              ? 'bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan neon-text'
              : 'bg-dark-card border border-dark-border text-gray-300'
          }`}
        >
          {editMode ? '✓ Режим расстановки' : '✎ Расставить переходы'}
        </button>
      </div>

      <div className="relative w-full rounded-xl overflow-hidden neon-border" style={{ height: '400px' }}>
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: '400px', cursor: editMode ? 'crosshair' : 'default' }}
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-dark-bg z-50">
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-3">
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-neon-cyan animate-spin"></div>
              </div>
              <p className="text-neon-cyan text-xs neon-text">Загрузка...</p>
            </div>
          </div>
        )}

        {editMode && (
          <div className="absolute top-3 left-3 glass-strong rounded-lg px-3 py-2 z-30">
            <p className="text-xs text-neon-cyan">
              {pendingClick ? '✓ Точка выбрана — выберите комнату ниже' : 'Кликните по панораме для установки стрелки'}
            </p>
          </div>
        )}

        <div className="absolute top-3 left-1/2 -translate-x-1/2 glass-strong rounded-lg px-4 py-1.5 z-30">
          <span className="text-neon-cyan text-sm font-medium neon-text">{room.name}</span>
        </div>
      </div>

      {pendingClick && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Координаты:</span>
            <span className="text-xs text-neon-cyan font-mono">
              yaw: {pendingClick.yaw.toFixed(1)}°, pitch: {pendingClick.pitch.toFixed(1)}°
            </span>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">Куда ведёт стрелка</label>
            <div className="flex flex-wrap gap-2">
              {otherRooms.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoom(r.id)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-all ${
                    selectedRoom === r.id
                      ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                      : 'border-dark-border bg-dark-card text-gray-300 hover:border-neon-cyan/30'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-2">Подпись при наведении (опционально)</label>
            <input
              type="text"
              value={hotspotLabel}
              onChange={(e) => setHotspotLabel(e.target.value)}
              className="w-full bg-dark-card border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan/50"
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
              className="text-gray-400 hover:text-white text-sm px-4 py-3"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {hotspots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Установленные переходы:</p>
          {hotspots.map((h) => {
            const targetRoom = rooms.find((r) => r.id === h.toRoomId);
            return (
              <div key={h.id} className="bg-dark-card border border-dark-border rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-neon-cyan/10 flex items-center justify-center">
                    <span className="text-neon-cyan text-sm">→</span>
                  </div>
                  <div>
                    <p className="text-sm text-white">{h.label}</p>
                    <p className="text-xs text-gray-500">
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
          <p className="text-sm text-gray-500">
            Переходы не установлены. Включите «Расставить переходы» и кликните по панораме.
          </p>
        </div>
      )}
    </div>
  );
}
