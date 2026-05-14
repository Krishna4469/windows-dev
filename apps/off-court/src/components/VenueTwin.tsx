import { useState, useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import IFCUpload from './IFCUpload.js';

type ViewMode = 'svg' | 'ifc' | 'live';
type Level = 'GF' | '1F';

type RoomType =
  | 'court' | 'cafe' | 'reception' | 'changing' | 'storage'
  | 'lobby' | 'firstaid' | 'toilets' | 'locker' | 'corridor'
  | 'studio' | 'wellness' | 'cowork' | 'kids' | 'meditation' | 'lounge';

interface Room {
  id: string;
  name: string;
  type: RoomType;
  capacity: number;
  x: number; y: number; w: number; h: number;
  floor: Level;
}

const TYPE_CFG: Record<RoomType, { fill: string; text: string; label: string }> = {
  court:      { fill: '#5A1E2B', text: '#FFB3BE', label: 'Sports Court' },
  cafe:       { fill: '#78350F', text: '#FCD34D', label: 'Café' },
  reception:  { fill: '#1E293B', text: '#94A3B8', label: 'Reception' },
  changing:   { fill: '#1C1C26', text: '#9CA3AF', label: 'Changing Room' },
  storage:    { fill: '#161620', text: '#6B7280', label: 'Storage' },
  lobby:      { fill: '#1A2D3A', text: '#60A5FA', label: 'Lobby' },
  firstaid:   { fill: '#3B1010', text: '#F87171', label: 'First Aid' },
  toilets:    { fill: '#161620', text: '#6B7280', label: 'Toilets' },
  locker:     { fill: '#1C1C26', text: '#9CA3AF', label: 'Locker Room' },
  corridor:   { fill: '#131318', text: '#4B5563', label: 'Corridor' },
  studio:     { fill: '#251850', text: '#C084FC', label: 'Studio' },
  wellness:   { fill: '#2A1230', text: '#F9A8D4', label: 'Wellness' },
  cowork:     { fill: '#0F1E3A', text: '#93C5FD', label: 'Co-Working' },
  kids:       { fill: '#2D2010', text: '#FCD34D', label: 'Kids Zone' },
  meditation: { fill: '#152015', text: '#86EFAC', label: 'Meditation' },
  lounge:     { fill: '#152820', text: '#34D399', label: 'Lounge' },
};

const ACTION: Partial<Record<RoomType, string>> = {
  studio:   'Book Class',
  wellness: 'Book Treatment',
  cowork:   'Book Desk',
  court:    'Book Court',
};

// Ground Floor — 16 rooms
const GF_ROOMS: Room[] = [
  { id: 'gf-pc1',      name: 'Padel Court 1', type: 'court',     capacity: 4,  x: 5,   y: 5,   w: 118, h: 90,  floor: 'GF' },
  { id: 'gf-pc2',      name: 'Padel Court 2', type: 'court',     capacity: 4,  x: 130, y: 5,   w: 118, h: 90,  floor: 'GF' },
  { id: 'gf-pc3',      name: 'Padel Court 3', type: 'court',     capacity: 4,  x: 255, y: 5,   w: 130, h: 90,  floor: 'GF' },
  { id: 'gf-cricket',  name: 'Cricket Court', type: 'court',     capacity: 22, x: 5,   y: 103, w: 245, h: 110, floor: 'GF' },
  { id: 'gf-cafe',     name: 'Café',          type: 'cafe',      capacity: 30, x: 257, y: 103, w: 128, h: 55,  floor: 'GF' },
  { id: 'gf-recep',    name: 'Reception',     type: 'reception', capacity: 10, x: 257, y: 166, w: 128, h: 47,  floor: 'GF' },
  { id: 'gf-chm',      name: 'Changing M',    type: 'changing',  capacity: 20, x: 5,   y: 221, w: 90,  h: 70,  floor: 'GF' },
  { id: 'gf-chf',      name: 'Changing F',    type: 'changing',  capacity: 20, x: 103, y: 221, w: 90,  h: 70,  floor: 'GF' },
  { id: 'gf-proshop',  name: 'Pro Shop',      type: 'reception', capacity: 15, x: 201, y: 221, w: 90,  h: 70,  floor: 'GF' },
  { id: 'gf-equip',    name: 'Equipment',     type: 'storage',   capacity: 0,  x: 299, y: 221, w: 86,  h: 70,  floor: 'GF' },
  { id: 'gf-lobby',    name: 'Lobby',         type: 'lobby',     capacity: 50, x: 5,   y: 299, w: 125, h: 65,  floor: 'GF' },
  { id: 'gf-firstaid', name: 'First Aid',     type: 'firstaid',  capacity: 4,  x: 138, y: 299, w: 75,  h: 65,  floor: 'GF' },
  { id: 'gf-toim',     name: 'Toilets M',     type: 'toilets',   capacity: 8,  x: 221, y: 299, w: 80,  h: 65,  floor: 'GF' },
  { id: 'gf-toif',     name: 'Toilets F',     type: 'toilets',   capacity: 8,  x: 309, y: 299, w: 76,  h: 65,  floor: 'GF' },
  { id: 'gf-locker',   name: 'Locker Room',   type: 'locker',    capacity: 40, x: 5,   y: 372, w: 185, h: 65,  floor: 'GF' },
  { id: 'gf-corridor', name: 'Corridor',      type: 'corridor',  capacity: 0,  x: 198, y: 372, w: 187, h: 65,  floor: 'GF' },
];

// First Floor — 14 rooms
const FF_ROOMS: Room[] = [
  { id: '1f-yoga1',  name: 'Yoga Studio 1',    type: 'studio',    capacity: 20, x: 5,   y: 5,   w: 185, h: 90, floor: '1F' },
  { id: '1f-yoga2',  name: 'Yoga Studio 2',    type: 'studio',    capacity: 20, x: 198, y: 5,   w: 187, h: 90, floor: '1F' },
  { id: '1f-fit1',   name: 'Fitness Studio 1', type: 'studio',    capacity: 25, x: 5,   y: 103, w: 185, h: 90, floor: '1F' },
  { id: '1f-fit2',   name: 'Fitness Studio 2', type: 'studio',    capacity: 25, x: 198, y: 103, w: 187, h: 90, floor: '1F' },
  { id: '1f-tr1',    name: 'Treatment Room 1', type: 'wellness',  capacity: 2,  x: 5,   y: 201, w: 119, h: 75, floor: '1F' },
  { id: '1f-tr2',    name: 'Treatment Room 2', type: 'wellness',  capacity: 2,  x: 132, y: 201, w: 119, h: 75, floor: '1F' },
  { id: '1f-tr3',    name: 'Treatment Room 3', type: 'wellness',  capacity: 2,  x: 259, y: 201, w: 126, h: 75, floor: '1F' },
  { id: '1f-cw1',    name: 'Co-Working 1',     type: 'cowork',    capacity: 12, x: 5,   y: 284, w: 185, h: 65, floor: '1F' },
  { id: '1f-cw2',    name: 'Co-Working 2',     type: 'cowork',    capacity: 12, x: 198, y: 284, w: 187, h: 65, floor: '1F' },
  { id: '1f-kids1',  name: 'Kids Zone',        type: 'kids',      capacity: 15, x: 5,   y: 357, w: 90,  h: 65, floor: '1F' },
  { id: '1f-kids2',  name: 'Kids Activity',    type: 'kids',      capacity: 15, x: 103, y: 357, w: 90,  h: 65, floor: '1F' },
  { id: '1f-med1',   name: 'Meditation 1',     type: 'meditation',capacity: 8,  x: 201, y: 357, w: 90,  h: 65, floor: '1F' },
  { id: '1f-med2',   name: 'Meditation 2',     type: 'meditation',capacity: 8,  x: 299, y: 357, w: 86,  h: 65, floor: '1F' },
  { id: '1f-lounge', name: 'Rooftop Lounge',   type: 'lounge',    capacity: 40, x: 5,   y: 430, w: 380, h: 60, floor: '1F' },
];

const GF_LEGEND: RoomType[] = ['court', 'cafe', 'reception', 'lobby', 'firstaid', 'changing'];
const FF_LEGEND: RoomType[] = ['studio', 'wellness', 'cowork', 'kids', 'meditation', 'lounge'];

const COURTS = GF_ROOMS.filter((r) => r.type === 'court');

function getLines(name: string, w: number): string[] {
  if (name.length * 6 <= w - 12) return [name];
  const words = name.split(' ');
  if (words.length < 2) return [name];
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const diff = Math.abs(
      words.slice(0, i).join(' ').length - words.slice(i).join(' ').length,
    );
    if (diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

function RoomRect({
  room,
  selected,
  onClick,
}: {
  room: Room;
  selected: boolean;
  onClick: () => void;
}) {
  const { fill, text } = TYPE_CFG[room.type];
  const cx = room.x + room.w / 2;
  const cy = room.y + room.h / 2;
  const lines = getLines(room.name, room.w);
  const lineH = 12;
  const startY = cy - ((lines.length - 1) * lineH) / 2;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }}>
      <rect
        x={room.x}
        y={room.y}
        width={room.w}
        height={room.h}
        fill={fill}
        stroke={selected ? '#fff' : '#2A2A35'}
        strokeWidth={selected ? 2 : 1}
        rx={3}
      />
      {lines.map((line, i) => (
        <text
          key={i}
          x={cx}
          y={startY + i * lineH}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={text}
          fontSize={10}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight={500}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function RoomSheet({ room, onClose }: { room: Room; onClose: () => void }) {
  const cfg = TYPE_CFG[room.type];
  const action = ACTION[room.type];

  return (
    <>
      <div
        className="fixed inset-0"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 40 }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md rounded-t-2xl px-6 pt-4 pb-8"
        style={{ backgroundColor: '#18181F', zIndex: 50 }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-neutral-700" />
        <span
          className="rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ backgroundColor: cfg.fill, color: cfg.text }}
        >
          {cfg.label}
        </span>
        <h2 className="mt-2 text-xl font-bold text-white">{room.name}</h2>
        <div className="mt-3 flex gap-6 text-sm">
          <div>
            <p className="text-xs" style={{ color: '#6B7280' }}>Floor</p>
            <p className="font-medium text-white">
              {room.floor === 'GF' ? 'Ground Floor' : 'First Floor'}
            </p>
          </div>
          {room.capacity > 0 && (
            <div>
              <p className="text-xs" style={{ color: '#6B7280' }}>Capacity</p>
              <p className="font-medium text-white">{room.capacity} people</p>
            </div>
          )}
        </div>
        {action && (
          <button
            className="mt-5 w-full rounded-xl py-3.5 text-base font-semibold text-white"
            style={{ backgroundColor: '#6B2737' }}
            onClick={() => { alert(`${action}: ${room.name}`); onClose(); }}
          >
            {action}
          </button>
        )}
        <button
          className="mt-3 w-full rounded-xl py-2.5 text-sm font-medium"
          style={{ backgroundColor: '#1C1C26', color: '#9CA3AF' }}
          onClick={onClose}
        >
          Dismiss
        </button>
      </div>
    </>
  );
}

type CourtStatus = 'available' | 'booked' | 'maintenance';

interface CourtState {
  id: string;
  name: string;
  status: CourtStatus;
  occupancy: number;
  capacity: number;
}

const STATUS_CFG: Record<CourtStatus, { bg: string; text: string; dot: string; label: string }> = {
  available:   { bg: '#0F2A1A', text: '#4ADE80', dot: '#22C55E', label: 'Available' },
  booked:      { bg: '#2A1E1A', text: '#FB923C', dot: '#F97316', label: 'Booked' },
  maintenance: { bg: '#1A1A2A', text: '#A78BFA', dot: '#8B5CF6', label: 'Maintenance' },
};

function LiveView() {
  const [courts, setCourts] = useState<CourtState[]>(() =>
    COURTS.map((r) => ({
      id: r.id,
      name: r.name,
      status: 'available' as CourtStatus,
      occupancy: 0,
      capacity: r.capacity,
    })),
  );
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: Socket = io('http://localhost:3002', { transports: ['websocket'] });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('court:status', (data: { id: string; status: CourtStatus; occupancy: number }) => {
      setCourts((prev) =>
        prev.map((c) => (c.id === data.id ? { ...c, status: data.status, occupancy: data.occupancy } : c)),
      );
    });

    return () => { socket.disconnect(); };
  }, []);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: connected ? '#22C55E' : '#6B7280' }}
        />
        <span className="text-xs" style={{ color: connected ? '#4ADE80' : '#6B7280' }}>
          {connected ? 'Live · Socket.IO connected' : 'Connecting…'}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {courts.map((court) => {
          const cfg = STATUS_CFG[court.status];
          return (
            <div
              key={court.id}
              className="rounded-xl px-4 py-3"
              style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.dot}33` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{court.name}</span>
                <span
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                  style={{ backgroundColor: `${cfg.dot}22`, color: cfg.text }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.dot }} />
                  {cfg.label}
                </span>
              </div>
              {court.capacity > 0 && (
                <div className="mt-2">
                  <div className="mb-1 flex justify-between text-xs" style={{ color: '#6B7280' }}>
                    <span>Occupancy</span>
                    <span>{court.occupancy} / {court.capacity}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: '#1C1C26' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${court.capacity > 0 ? (court.occupancy / court.capacity) * 100 : 0}%`,
                        backgroundColor: cfg.dot,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs" style={{ color: '#4B5563' }}>
        Updates in real-time via Socket.IO · court:status events
      </p>
    </div>
  );
}

interface IFCViewProps {
  venueId: string;
}

function IFCView({ venueId }: IFCViewProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/ifc/uploads?venue_id=${encodeURIComponent(venueId)}`)
      .then((r) => r.json())
      .then((uploads: Array<{ upload_status: string }>) => {
        const hasCompleted = uploads.some((u) => u.upload_status === 'completed');
        if (!hasCompleted) return undefined;
        return fetch(`/api/spatial/viewer-embed?venueId=${encodeURIComponent(venueId)}`)
          .then((r) => r.json())
          .then((data: { url: string }) => setEmbedUrl(data.url));
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [venueId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#6B7280' }}>
        Checking IFC uploads…
      </div>
    );
  }

  if (embedUrl) {
    if (embedUrl.includes('localhost')) {
      return (
        <div
          className="flex flex-col items-center justify-center rounded-xl px-6 py-14"
          style={{ backgroundColor: '#0D0D12', minHeight: 480 }}
        >
          <p className="mb-6 text-base font-semibold text-white">
            3D Viewer available on live server
          </p>
          <div
            className="w-full max-w-sm rounded-xl px-5 py-4"
            style={{ backgroundColor: '#3A1520', borderLeft: '4px solid #6B2737' }}
          >
            <p className="text-sm leading-relaxed" style={{ color: '#FFB3BE' }}>
              This feature requires the production environment. The Spatial OS 3D
              viewer cannot be embedded when running on localhost.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-xl" style={{ backgroundColor: '#0D0D12' }}>
        <iframe
          src={embedUrl}
          title="Spatial OS 3D Viewer"
          className="w-full"
          style={{ height: 480, border: 'none' }}
          allow="fullscreen"
        />
      </div>
    );
  }

  return <IFCUpload />;
}

const VIEW_MODES: { key: ViewMode; label: string; sub: string }[] = [
  { key: 'svg', label: 'SVG',  sub: 'Parametric' },
  { key: 'ifc', label: 'IFC',  sub: '3D Twin' },
  { key: 'live', label: 'Live', sub: 'Real-time' },
];

export function VenueTwin() {
  const [viewMode, setViewMode] = useState<ViewMode>('svg');
  const [level, setLevel] = useState<Level>('GF');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const rooms = level === 'GF' ? GF_ROOMS : FF_ROOMS;
  const viewBox = level === 'GF' ? '0 0 390 445' : '0 0 390 498';
  const legend = level === 'GF' ? GF_LEGEND : FF_LEGEND;

  return (
    <div className="min-h-full px-4 py-6" style={{ backgroundColor: '#111118' }}>
      <h1 className="text-xl font-semibold text-white">Venue Twin</h1>
      <p className="mt-0.5 mb-5 text-xs" style={{ color: '#6B7280' }}>
        Parametric floor plan · IFC digital twin · Live court status
      </p>

      {/* View mode switcher */}
      <div className="mb-4 flex gap-1 rounded-xl p-1" style={{ backgroundColor: '#1C1C26' }}>
        {VIEW_MODES.map(({ key, label, sub }) => (
          <button
            key={key}
            onClick={() => { setViewMode(key); setSelectedRoom(null); }}
            className="flex flex-1 flex-col items-center rounded-lg py-2 transition-colors"
            style={viewMode === key ? { backgroundColor: '#6B2737' } : {}}
          >
            <span
              className="text-base font-bold leading-none"
              style={{ color: viewMode === key ? '#fff' : '#6B7280' }}
            >
              {label}
            </span>
            <span
              className="mt-0.5 text-[10px]"
              style={{ color: viewMode === key ? '#FFB3BE' : '#4B5563' }}
            >
              {sub}
            </span>
          </button>
        ))}
      </div>

      {/* SVG mode */}
      {viewMode === 'svg' && (
        <>
          {/* Level switcher */}
          <div className="mb-4 flex gap-1 rounded-xl p-1" style={{ backgroundColor: '#16161E' }}>
            {(['GF', '1F'] as const).map((lv) => (
              <button
                key={lv}
                onClick={() => { setLevel(lv); setSelectedRoom(null); }}
                className="flex flex-1 flex-col items-center rounded-lg py-2 transition-colors"
                style={level === lv ? { backgroundColor: '#3A1520' } : {}}
              >
                <span
                  className="text-base font-bold leading-none"
                  style={{ color: level === lv ? '#fff' : '#6B7280' }}
                >
                  {lv}
                </span>
                <span
                  className="mt-0.5 text-[10px]"
                  style={{ color: level === lv ? '#FFB3BE' : '#4B5563' }}
                >
                  {lv === 'GF' ? 'Ground Floor' : 'First Floor'}
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-xl" style={{ backgroundColor: '#0D0D12' }}>
            <svg viewBox={viewBox} width="100%" style={{ display: 'block' }}>
              {rooms.map((room) => (
                <RoomRect
                  key={room.id}
                  room={room}
                  selected={selectedRoom?.id === room.id}
                  onClick={() => setSelectedRoom(room)}
                />
              ))}
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {legend.map((type) => {
              const cfg = TYPE_CFG[type];
              return (
                <span
                  key={type}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{ backgroundColor: cfg.fill, color: cfg.text }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cfg.text }} />
                  {cfg.label}
                </span>
              );
            })}
          </div>

          <p className="mt-3 text-center text-xs" style={{ color: '#4B5563' }}>
            Tap any room to see details
          </p>

          {selectedRoom && (
            <RoomSheet room={selectedRoom} onClose={() => setSelectedRoom(null)} />
          )}
        </>
      )}

      {/* IFC mode */}
      {viewMode === 'ifc' && <IFCView venueId="demo-venue" />}

      {/* Live mode */}
      {viewMode === 'live' && <LiveView />}
    </div>
  );
}
