'use client';

import { useState } from 'react';

interface Room {
  id: string;
  name: string;
  order: number;
}

interface RoomNavigatorProps {
  rooms: Room[];
  currentRoomId: string;
  onRoomChange: (roomId: string) => void;
}

export default function RoomNavigator({
  rooms,
  currentRoomId,
  onRoomChange,
}: RoomNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const sortedRooms = [...rooms].sort((a, b) => a.order - b.order);
  const currentIndex = sortedRooms.findIndex((r) => r.id === currentRoomId);

  return (
    <>
      {/* Desktop: top-right dropdown */}
      <div className="absolute top-4 right-4 z-[100] hidden sm:block">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="glass-strong rounded-lg px-3.5 py-2 flex items-center gap-2 hover:border-bright transition-all duration-300"
        >
          <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span className="text-sm text-ink-100">Комнаты</span>
          <span className="text-xs text-accent font-medium">
            {currentIndex + 1}/{sortedRooms.length}
          </span>
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 glass-strong rounded-lg p-2 min-w-[200px] animate-slide-down">
            {sortedRooms.map((room, idx) => (
              <button
                key={room.id}
                onClick={() => {
                  onRoomChange(room.id);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 flex items-center gap-3 ${
                  room.id === currentRoomId
                    ? 'bg-accent/10 text-accent border border-accent/15'
                    : 'text-ink-200 hover:bg-white/5 hover:text-ink-50 border border-transparent'
                }`}
              >
                <span className="text-xs opacity-50">{idx + 1}</span>
                <span>{room.name}</span>
                {room.id === currentRoomId && (
                  <span className="ml-auto text-accent">●</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mobile: bottom bar with horizontal scroll */}
      <div className="absolute bottom-0 left-0 right-0 z-[200] sm:hidden">
        <div className="glass-strong border-t border-border-subtle px-2 py-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          {sortedRooms.map((room, idx) => (
            <button
              key={room.id}
              onClick={() => onRoomChange(room.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                room.id === currentRoomId
                  ? 'bg-accent/15 text-accent border border-accent/20'
                  : 'text-ink-200 border border-transparent'
              }`}
            >
              {idx + 1}. {room.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
