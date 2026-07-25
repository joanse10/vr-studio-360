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
  const [imagesLoaded, setImagesLoaded] = useState({ before: false, after: false });

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

    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      updatePosition(e.touches[0].clientX);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

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

  const allLoaded = imagesLoaded.before && imagesLoaded.after;

  return (
    <div
      ref={containerRef}
      className={`ba-slider relative w-full rounded-xl overflow-hidden neon-border cursor-ew-resize ${className}`}
      style={{ aspectRatio: '16/9' }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {!allLoaded && (
        <div className="absolute inset-0 shimmer-bg z-50 flex items-center justify-center">
          <div className="text-neon-cyan text-sm">Загрузка...</div>
        </div>
      )}

      {/* After image (full) */}
      <img
        src={afterImage}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        onLoad={() => setImagesLoaded((prev) => ({ ...prev, after: true }))}
        draggable={false}
      />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeImage}
          alt={beforeLabel}
          className="absolute inset-0 h-full object-cover"
          style={{ width: `${containerRef.current?.clientWidth || 1000}px` }}
          onLoad={() => setImagesLoaded((prev) => ({ ...prev, before: true }))}
          draggable={false}
        />
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 glass-strong rounded-md px-3 py-1 z-20">
        <span className="text-xs font-medium text-gray-300">{beforeLabel}</span>
      </div>
      <div className="absolute top-3 right-3 glass-strong rounded-md px-3 py-1 z-20">
        <span className="text-xs font-medium text-neon-cyan neon-text">{afterLabel}</span>
      </div>

      {/* Slider handle */}
      <div
        className="ba-slider-handle"
        style={{ left: `${position}%` }}
      />
    </div>
  );
}
