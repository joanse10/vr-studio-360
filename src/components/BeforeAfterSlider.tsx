'use client';

import { useRef, useState, useCallback, useEffect } from 'react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export default function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'До',
  afterLabel = 'После',
  className = '',
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(percent);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    updatePosition(e.touches[0].clientX);
  }, [updatePosition]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => updatePosition(e.clientX);
    const handleTouchMove = (e: TouchEvent) => updatePosition(e.touches[0].clientX);
    const handleEnd = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, updatePosition]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden cursor-ew-resize select-none ${className}`}
      style={{ aspectRatio: '16/9' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* After image — full */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Before image — clipped from right using clip-path */}
      <img
        src={beforeImage}
        alt={beforeLabel}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />

      {/* Labels */}
      <div
        className="absolute top-4 left-4 z-20 transition-opacity duration-200"
        style={{ opacity: position > 10 ? 1 : 0 }}
      >
        <span className="px-3 py-1.5 rounded-full text-xs font-semibold text-ink-50 bg-ink-900/70 backdrop-blur-md border border-accent/20">
          {beforeLabel}
        </span>
      </div>
      <div
        className="absolute top-4 right-4 z-20 transition-opacity duration-200"
        style={{ opacity: position < 90 ? 1 : 0 }}
      >
        <span className="px-3 py-1.5 rounded-full text-xs font-semibold text-accent-bright bg-ink-900/70 backdrop-blur-md border border-accent/20">
          {afterLabel}
        </span>
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 z-10 pointer-events-none"
        style={{
          left: `${position}%`,
          transform: 'translateX(-50%)',
          width: '2px',
          background: 'linear-gradient(180deg, transparent 0%, #e8a87c 15%, #f0b896 50%, #e8a87c 85%, transparent 100%)',
          boxShadow: '0 0 12px rgba(232,168,124,0.4)',
        }}
      />

      {/* Handle */}
      <div
        className="absolute top-1/2 z-30 pointer-events-none"
        style={{
          left: `${position}%`,
          transform: 'translate(-50%, -50%)',
        }}
      >
        <div
          className="flex items-center justify-center rounded-full transition-all duration-200"
          style={{
            width: isDragging ? 48 : 42,
            height: isDragging ? 48 : 42,
            background: 'linear-gradient(135deg, #f0b896, #c98a63)',
            boxShadow: isDragging
              ? '0 4px 20px rgba(232,168,124,0.5), 0 0 0 4px rgba(232,168,124,0.15)'
              : '0 2px 12px rgba(0,0,0,0.5), 0 0 0 3px rgba(232,168,124,0.1)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0c0c0e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0c0c0e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </div>
  );
}
