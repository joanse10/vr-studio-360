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
    <div className="absolute top-4 right-4 z-30">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-strong rounded-lg px-4 py-2 flex items-center gap-2 hover:neon-border transition-all duration-300"
      >
        <svg className="w-4 h-4 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span className="text-sm text-gray-300">Комнаты</span>
        <span className="text-xs text-neon-cyan font-medium">
          {currentIndex + 1}/{sortedRooms.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 glass-strong rounded-lg p-2 min-w-[200px] animate-slide-up">
          {sortedRooms.map((room, idx) => (
            <button
              key={room.id}
              onClick={() => {
                onRoomChange(room.id);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all duration-200 flex items-center gap-3 ${
                room.id === currentRoomId
                  ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-purple/20 text-neon-cyan'
                  : 'text-gray-400 hover:bg-white/5 hover:text-neon-cyan'
              }`}
            >
              <span className="text-xs opacity-50">{idx + 1}</span>
              <span>{room.name}</span>
              {room.id === currentRoomId && (
                <span className="ml-auto text-neon-cyan">●</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
