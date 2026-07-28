'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import RoomNavigator from './RoomNavigator';

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

const Viewer360 = dynamic(() => import('./Viewer360'), { ssr: false });

interface ViewerWithNavigatorProps {
  rooms: Room[];
}

export default function ViewerWithNavigator({ rooms }: ViewerWithNavigatorProps) {
  const [currentRoomId, setCurrentRoomId] = useState(rooms[0]?.id || '');

  const handleRoomChange = useCallback((roomId: string) => {
    setCurrentRoomId(roomId);
  }, []);

  if (rooms.length === 0) return null;

  return (
    <Viewer360
      rooms={rooms}
      initialRoomId={currentRoomId}
      onRoomChange={handleRoomChange}
    >
      <RoomNavigator
        rooms={rooms.map((r, idx) => ({ id: r.id, name: r.name, order: idx }))}
        currentRoomId={currentRoomId}
        onRoomChange={handleRoomChange}
      />
    </Viewer360>
  );
}
