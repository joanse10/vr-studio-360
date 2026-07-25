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
  initialYaw: number;
  initialPitch: number;
  initialHfov: number;
  hotspots: Hotspot[];
}

interface Viewer360Props {
  rooms: Room[];
  initialRoomId?: string;
  onRoomChange?: (roomId: string) => void;
  autoRotate?: boolean;
}

export default function Viewer360({
  rooms,
  initialRoomId,
  onRoomChange,
  autoRotate = false,
}: Viewer360Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string>(
    initialRoomId || rooms[0]?.id || ''
  );
  const [loading, setLoading] = useState(true);
  const [pannellumLoaded, setPannellumLoaded] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const currentRoom = rooms.find((r) => r.id === currentRoomId);

  const switchRoom = useCallback(
    (roomId: string) => {
      if (!viewerRef.current || roomId === currentRoomId) return;
      setTransitioning(true);
      setLoading(true);
      viewerRef.current.loadScene(roomId);
      setCurrentRoomId(roomId);
      onRoomChange?.(roomId);
      setTimeout(() => setTransitioning(false), 800);
    },
    [currentRoomId, onRoomChange]
  );

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

  const createViewer = useCallback(
    (room: Room) => {
      if (!containerRef.current || !window.pannellum) return;

      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }

      const scenes: Record<string, any> = {};
      rooms.forEach((r) => {
        scenes[r.id] = {
          title: r.name,
          panorama: r.panoramaUrl,
          hfov: r.initialHfov,
          pitch: r.initialPitch,
          yaw: r.initialYaw,
          hotSpots: r.hotspots.map((h) => ({
            id: h.id,
            pitch: h.pitch,
            yaw: h.yaw,
            type: 'scene',
            text: h.label,
            sceneId: h.toRoomId,
            cssClass: 'custom-hotspot',
            clickHandlerFunc: () => {
              switchRoom(h.toRoomId);
            },
            clickHandlerArgs: {},
          })),
          autoRotate: autoRotate ? -2 : undefined,
        };
      });

      viewerRef.current = window.pannellum.viewer(containerRef.current, {
        default: {
          firstScene: room.id,
          sceneFadeDuration: 800,
          autoLoad: true,
        },
        scenes,
      });

      viewerRef.current.on('load', () => {
        setLoading(false);
      });

      viewerRef.current.on('sceneChange', (sceneId: string) => {
        setCurrentRoomId(sceneId);
        onRoomChange?.(sceneId);
      });
    },
    [rooms, autoRotate, onRoomChange, switchRoom]
  );

  useEffect(() => {
    loadPannellum().then(() => {
      if (currentRoom) {
        createViewer(currentRoom);
      }
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
    if (pannellumLoaded && currentRoom && !viewerRef.current) {
      createViewer(currentRoom);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pannellumLoaded, currentRoom]);

  useEffect(() => {
    if (viewerRef.current && initialRoomId && initialRoomId !== currentRoomId) {
      switchRoom(initialRoomId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRoomId]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-dark-bg z-50">
          <div className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-dark-border"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-neon-cyan animate-spin"></div>
              <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-neon-purple animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="text-neon-cyan text-sm neon-text">Загрузка панорамы...</p>
          </div>
        </div>
      )}

      {transitioning && (
        <div className="absolute inset-0 bg-dark-bg z-40 animate-fade-in pointer-events-none" />
      )}

      {currentRoom && (
        <div className="absolute top-4 left-4 glass-strong rounded-lg px-4 py-2 z-30">
          <span className="text-neon-cyan text-sm font-medium neon-text">
            {currentRoom.name}
          </span>
        </div>
      )}

    </div>
  );
}
