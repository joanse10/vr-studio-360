'use client';

import { useState, useEffect, useCallback } from 'react';
import BeforeAfterSlider from './BeforeAfterSlider';

interface BeforeAfterItem {
  id: string;
  title: string;
  beforeImage: string;
  afterImage: string;
}

interface BeforeAfterModalProps {
  items: BeforeAfterItem[];
}

export default function BeforeAfterModal({ items }: BeforeAfterModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const open = useCallback((index: number = 0) => {
    setCurrentIndex(index);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const next = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close, next, prev]);

  if (items.length === 0) return null;

  const current = items[currentIndex];

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => open(0)}
        className="glass-strong rounded-lg px-4 py-2.5 flex items-center gap-2 hover:border-bright transition-all duration-300"
      >
        <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7l8 8m0-8l-8 8" />
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
        </svg>
        <span className="text-sm text-ink-100">До / После</span>
        <span className="text-xs text-accent font-medium">{items.length}</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={close}
        >
          <div
            className="relative w-full max-w-5xl mx-4 rounded-2xl overflow-hidden glass-strong"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div className="flex items-center gap-3 min-w-0">
                <h3 className="text-sm font-semibold text-ink-50 truncate">
                  {current.title || `До / После ${currentIndex + 1}`}
                </h3>
                {items.length > 1 && (
                  <span className="text-xs text-ink-300 flex-shrink-0">
                    {currentIndex + 1} / {items.length}
                  </span>
                )}
              </div>
              <button
                onClick={close}
                className="flex items-center justify-center w-8 h-8 rounded-md text-ink-200 hover:bg-white/10 hover:text-ink-50 transition-colors flex-shrink-0"
                aria-label="Закрыть"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Slider */}
            <div className="p-4 sm:p-6">
              <BeforeAfterSlider
                beforeImage={current.beforeImage}
                afterImage={current.afterImage}
                className="max-h-[70vh]"
              />
            </div>

            {/* Navigation */}
            {items.length > 1 && (
              <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-border-subtle">
                <button
                  onClick={prev}
                  className="flex items-center justify-center w-9 h-9 rounded-md text-ink-200 hover:bg-white/10 hover:text-ink-50 transition-colors"
                  aria-label="Предыдущее"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                {/* Thumbnails */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide max-w-md">
                  {items.map((item, idx) => (
                    <button
                      key={item.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`flex-shrink-0 w-16 h-10 rounded-md overflow-hidden border-2 transition-all ${
                        idx === currentIndex
                          ? 'border-accent opacity-100'
                          : 'border-transparent opacity-50 hover:opacity-80'
                      }`}
                    >
                      <img src={item.afterImage} alt={item.title} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>

                <button
                  onClick={next}
                  className="flex items-center justify-center w-9 h-9 rounded-md text-ink-200 hover:bg-white/10 hover:text-ink-50 transition-colors"
                  aria-label="Следующее"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
