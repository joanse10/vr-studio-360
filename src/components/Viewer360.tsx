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

interface InfoHotspot {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkText: string | null;
  yaw: number;
  pitch: number;
}

interface Room {
  id: string;
  name: string;
  panoramaUrl: string;
  initialYaw: number;
  initialPitch: number;
  initialHfov: number;
  hotspots: Hotspot[];
  infoHotspots: InfoHotspot[];
}

interface Viewer360Props {
  rooms: Room[];
  initialRoomId?: string;
  onRoomChange?: (roomId: string) => void;
  autoRotate?: boolean;
  children?: React.ReactNode;
}

export default function Viewer360({
  rooms,
  initialRoomId,
  onRoomChange,
  autoRotate = false,
  children,
}: Viewer360Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string>(
    initialRoomId || rooms[0]?.id || ''
  );
  const [loading, setLoading] = useState(true);
  const [pannellumLoaded, setPannellumLoaded] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionRoom, setTransitionRoom] = useState<string>('');

  const currentRoom = rooms.find((r) => r.id === currentRoomId);

  const switchRoom = useCallback(
    (roomId: string) => {
      if (!viewerRef.current || roomId === currentRoomId) return;
      const targetRoom = rooms.find((r) => r.id === roomId);
      setTransitionRoom(targetRoom?.name || '');
      setTransitioning(true);
      setLoading(true);
      viewerRef.current.loadScene(roomId);
      setCurrentRoomId(roomId);
      onRoomChange?.(roomId);
      setTimeout(() => setTransitioning(false), 1200);
    },
    [currentRoomId, onRoomChange, rooms]
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
          hotSpots: [
            ...r.hotspots.map((h) => {
              const targetRoom = rooms.find((rm) => rm.id === h.toRoomId);
              return {
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
                createTooltipFunc: (data: any) => {
                  const div = document.createElement('div');
                  div.className = 'hotspot-preview';
                  div.innerHTML = `
                    <div class="hotspot-preview__image" style="background-image: url('${targetRoom?.panoramaUrl || ''}')"></div>
                    <div class="hotspot-preview__body">
                      <div class="hotspot-preview__label">${h.label || targetRoom?.name || ''}</div>
                      <div class="hotspot-preview__hint">Нажмите чтобы перейти →</div>
                    </div>
                  `;
                  data.appendChild(div);
                },
                createTooltipArgs: {},
              };
            }),
            ...r.infoHotspots.map((ih) => ({
              id: ih.id,
              pitch: ih.pitch,
              yaw: ih.yaw,
              type: 'info',
              text: ih.title,
              cssClass: 'info-hotspot',
              clickHandlerFunc: (e: any) => {
                e.preventDefault();
                e.stopPropagation();
                const hotspot = e.currentTarget || (e.target && e.target.closest('.info-hotspot'));
                if (!hotspot) return;
                const popup = hotspot.querySelector('.info-hotspot-popup');
                if (!popup) return;
                const isOpen = popup.style.display === 'block';
                document.querySelectorAll('.info-hotspot-popup').forEach((p) => {
                  (p as HTMLElement).style.display = 'none';
                });
                popup.style.display = isOpen ? 'none' : 'block';
                return false;
              },
              clickHandlerArgs: {},
              createTooltipFunc: (data: any) => {
                const div = document.createElement('div');
                div.className = 'info-hotspot-popup';
                div.innerHTML = `
                  ${ih.imageUrl ? `<div class="info-hotspot-popup__image" style="background-image: url('${ih.imageUrl}')"></div>` : ''}
                  <div class="info-hotspot-popup__body">
                    <div class="info-hotspot-popup__title">${ih.title}</div>
                    ${ih.description ? `<div class="info-hotspot-popup__desc">${ih.description}</div>` : ''}
                    ${ih.linkUrl ? `<a href="${ih.linkUrl}" target="_blank" rel="noopener noreferrer" class="info-hotspot-popup__link">${ih.linkText} →</a>` : ''}
                  </div>
                `;
                data.appendChild(div);
              },
              createTooltipArgs: {},
            })),
          ],
          autoRotate: autoRotate ? -2 : undefined,
        };
      });

      viewerRef.current = window.pannellum.viewer(containerRef.current, {
        default: {
          firstScene: room.id,
          sceneFadeDuration: 800,
          autoLoad: true,
          touchPanSpeedCoeff: 1.5,
          friction: 0.15,
          showZoomCtrl: false,
          showFullscreenCtrl: false,
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

      const handleGlobalClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.info-hotspot')) {
          document.querySelectorAll('.info-hotspot-popup').forEach((p) => {
            (p as HTMLElement).style.display = 'none';
          });
        }
      };
      document.addEventListener('click', handleGlobalClick);

      return () => {
        document.removeEventListener('click', handleGlobalClick);
      };
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
    <div ref={wrapperRef} className="relative w-full h-full z-0">
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-900 z-50">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-border-default"></div>
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin"></div>
            </div>
            <p className="text-accent text-sm">Загрузка панорамы...</p>
          </div>
        </div>
      )}

      {transitioning && (
        <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 transition-overlay" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center transition-content">
              <div className="transition-icon mb-3">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f0b896" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
              </div>
              <p className="text-accent-bright text-sm font-medium tracking-tight transition-label">
                {transitionRoom}
              </p>
            </div>
          </div>
        </div>
      )}

      {currentRoom && (
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 glass-strong rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 z-[100] max-w-[60%] truncate">
          <span className="text-xs sm:text-sm text-ink-50 font-medium tracking-tight">
            {currentRoom.name}
          </span>
        </div>
      )}

      {/* Custom compact controls */}
      <div className="absolute bottom-16 sm:bottom-4 right-3 sm:right-4 z-[300] flex flex-row gap-1.5 glass-strong rounded-lg p-1.5 pointer-events-auto">
        <button
          onClick={() => {
            const v = viewerRef.current;
            if (!v) return;
            const hfov = v.getHfov();
            v.setHfov(hfov * 0.8);
          }}
          className="flex items-center justify-center w-8 h-8 rounded-md text-ink-50 hover:bg-white/10 transition-colors"
          aria-label="Увеличить"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button
          onClick={() => {
            const v = viewerRef.current;
            if (!v) return;
            const hfov = v.getHfov();
            v.setHfov(hfov * 1.25);
          }}
          className="flex items-center justify-center w-8 h-8 rounded-md text-ink-50 hover:bg-white/10 transition-colors"
          aria-label="Уменьшить"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </button>
        <button
          onClick={() => {
            const el = wrapperRef.current;
            if (!el) return;
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              el.requestFullscreen();
            }
          }}
          className="flex items-center justify-center w-8 h-8 rounded-md text-ink-50 hover:bg-white/10 transition-colors"
          aria-label="На весь экран"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
      </div>

      {children}

    </div>
  );
}
