import { useState, useEffect } from 'react';

const BG = '#0D0D11';
const CARD = '#18181F';
const BORDER = '#2A2A38';
const MERLOT = '#6B2737';
const MERLOT_LIGHT = '#E9B4BD';
const WHITE = '#F9FAFB';
const GRAY = '#6B7280';
const DEMO_VENUE_ID = '00000000-0000-0000-0000-000000000001';

const TYPE_ICONS: Record<string, string> = {
  entrance: '🚪', court: '🎾', studio: '🎵', wellness: '💆',
  cafe: '☕', toilet: '🚻', elevator: '🛗', exit: '🚪',
};

const TYPE_COLORS: Record<string, string> = {
  entrance: '#4ADE80', court: '#60A5FA', studio: '#A78BFA', wellness: '#34D399',
  cafe: '#FB923C', toilet: '#94A3B8', elevator: '#FBBF24', exit: '#F87171',
};

interface Waypoint {
  id: string;
  venue_id: string;
  label: string;
  room_id: string | null;
  floor_number: number;
  x_position: string;
  y_position: string;
  z_position: string;
  waypoint_type: string;
  connected_to: string[];
  created_at: string;
}

interface Direction {
  step: number;
  instruction: string;
  waypointId: string;
}

const DEMO_WAYPOINTS: Waypoint[] = [
  { id: 'wp-1', label: 'Main Entrance', waypoint_type: 'entrance', x_position: '50', y_position: '8', z_position: '0', floor_number: 0, connected_to: ['wp-2'], venue_id: DEMO_VENUE_ID, room_id: null, created_at: '' },
  { id: 'wp-2', label: 'Reception', waypoint_type: 'entrance', x_position: '50', y_position: '25', z_position: '0', floor_number: 0, connected_to: ['wp-1', 'wp-3', 'wp-4', 'wp-8'], venue_id: DEMO_VENUE_ID, room_id: null, created_at: '' },
  { id: 'wp-3', label: 'Court 1', waypoint_type: 'court', x_position: '18', y_position: '50', z_position: '0', floor_number: 0, connected_to: ['wp-2', 'wp-7'], venue_id: DEMO_VENUE_ID, room_id: null, created_at: '' },
  { id: 'wp-4', label: 'Court 2', waypoint_type: 'court', x_position: '82', y_position: '50', z_position: '0', floor_number: 0, connected_to: ['wp-2', 'wp-5'], venue_id: DEMO_VENUE_ID, room_id: null, created_at: '' },
  { id: 'wp-5', label: 'Café', waypoint_type: 'cafe', x_position: '82', y_position: '72', z_position: '0', floor_number: 0, connected_to: ['wp-4', 'wp-6'], venue_id: DEMO_VENUE_ID, room_id: null, created_at: '' },
  { id: 'wp-6', label: 'Wellness Zone', waypoint_type: 'wellness', x_position: '50', y_position: '87', z_position: '0', floor_number: 0, connected_to: ['wp-5', 'wp-7', 'wp-9'], venue_id: DEMO_VENUE_ID, room_id: null, created_at: '' },
  { id: 'wp-7', label: 'Studio A', waypoint_type: 'studio', x_position: '18', y_position: '78', z_position: '0', floor_number: 0, connected_to: ['wp-3', 'wp-6', 'wp-9'], venue_id: DEMO_VENUE_ID, room_id: null, created_at: '' },
  { id: 'wp-8', label: 'Elevator', waypoint_type: 'elevator', x_position: '50', y_position: '50', z_position: '0', floor_number: 0, connected_to: ['wp-2', 'wp-9'], venue_id: DEMO_VENUE_ID, room_id: null, created_at: '' },
  { id: 'wp-9', label: 'Toilets', waypoint_type: 'toilet', x_position: '34', y_position: '65', z_position: '0', floor_number: 0, connected_to: ['wp-8', 'wp-6', 'wp-7'], venue_id: DEMO_VENUE_ID, room_id: null, created_at: '' },
];

function bfsPath(fromId: string, toId: string, wps: Waypoint[]): string[] {
  const graph = new Map(wps.map(w => [w.id, w.connected_to]));
  const queue: string[][] = [[fromId]];
  const visited = new Set([fromId]);
  while (queue.length > 0) {
    const p = queue.shift()!;
    const node = p[p.length - 1]!;
    if (node === toId) return p;
    for (const nb of graph.get(node) ?? []) {
      if (!visited.has(nb)) {
        visited.add(nb);
        queue.push([...p, nb]);
      }
    }
  }
  return [];
}

function buildDirections(path: string[], wps: Waypoint[]): Direction[] {
  const m = new Map(wps.map(w => [w.id, w]));
  return path.map((id, i) => {
    const wp = m.get(id)!;
    if (i === 0) return { step: 1, instruction: `Start at ${wp.label}`, waypointId: id };
    if (i === path.length - 1) return { step: i + 1, instruction: `You have arrived at ${wp.label}`, waypointId: id };
    if (wp.waypoint_type === 'elevator') return { step: i + 1, instruction: `Take the ${wp.label}`, waypointId: id };
    const prev = m.get(path[i - 1]!)!;
    const next = m.get(path[i + 1]!)!;
    const dx1 = parseFloat(wp.x_position) - parseFloat(prev.x_position);
    const dy1 = parseFloat(wp.y_position) - parseFloat(prev.y_position);
    const dx2 = parseFloat(next.x_position) - parseFloat(wp.x_position);
    const dy2 = parseFloat(next.y_position) - parseFloat(wp.y_position);
    const cross = dx1 * dy2 - dy1 * dx2;
    if (cross > 0) return { step: i + 1, instruction: `Turn right at ${wp.label}`, waypointId: id };
    if (cross < 0) return { step: i + 1, instruction: `Turn left at ${wp.label}`, waypointId: id };
    return { step: i + 1, instruction: `Go straight to ${wp.label}`, waypointId: id };
  });
}

export function ARWayfinding({ venueId = DEMO_VENUE_ID }: { venueId?: string }) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [toId, setToId] = useState<string>('');
  const [path, setPath] = useState<string[]>([]);
  const [directions, setDirections] = useState<Direction[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [navigating, setNavigating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [arrived, setArrived] = useState(false);

  useEffect(() => {
    fetch(`/api/ar/waypoints?venueId=${venueId}`)
      .then(r => r.json())
      .then((data: unknown) => {
        const wps = Array.isArray(data) && data.length > 0
          ? (data as Waypoint[])
          : DEMO_WAYPOINTS;
        setWaypoints(wps);
        const first = wps.find(w => w.waypoint_type !== 'entrance');
        if (first) setToId(first.id);
      })
      .catch(() => {
        setWaypoints(DEMO_WAYPOINTS);
        const first = DEMO_WAYPOINTS.find(w => w.waypoint_type !== 'entrance');
        if (first) setToId(first.id);
      });
  }, [venueId]);

  const fromWaypoint = waypoints.find(w => w.waypoint_type === 'entrance') ?? waypoints[0];
  const fromId = fromWaypoint?.id ?? '';
  const destinations = waypoints.filter(w => w.id !== fromId);
  const waypointMap = new Map(waypoints.map(w => [w.id, w]));

  const handleGetDirections = (): void => {
    if (!fromId || !toId) return;
    setLoading(true);

    fetch(`/api/ar/navigate?from=${fromId}&to=${toId}&venueId=${venueId}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('api'))))
      .then((data: unknown) => {
        const d = data as { path: string[]; directions: Direction[] };
        setPath(d.path);
        setDirections(d.directions);
      })
      .catch(() => {
        const p = bfsPath(fromId, toId, waypoints);
        setPath(p);
        setDirections(buildDirections(p, waypoints));
      })
      .finally(() => {
        setCurrentStep(0);
        setNavigating(true);
        setArrived(false);
        setLoading(false);
      });
  };

  const handleNextStep = (): void => {
    if (currentStep >= directions.length - 1) {
      setArrived(true);
    } else {
      setCurrentStep(s => s + 1);
    }
  };

  const resetNav = (): void => {
    setNavigating(false);
    setArrived(false);
    setPath([]);
    setDirections([]);
    setCurrentStep(0);
  };

  return (
    <div style={{ background: BG, minHeight: '100vh', padding: '16px 16px 32px', fontFamily: 'system-ui, sans-serif', color: WHITE }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: WHITE, fontSize: 22, fontWeight: 700, margin: 0 }}>AR Wayfinding</h1>
          <p style={{ color: GRAY, fontSize: 13, margin: '4px 0 0' }}>
            {fromWaypoint ? `From: ${TYPE_ICONS[fromWaypoint.waypoint_type] ?? '📍'} ${fromWaypoint.label}` : 'Loading…'}
          </p>
        </div>

        {/* Destination selector */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: GRAY, fontSize: 12, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Destination
          </label>
          <select
            value={toId}
            onChange={e => { setToId(e.target.value); resetNav(); }}
            style={{
              width: '100%', padding: '10px 12px', background: CARD, color: WHITE,
              border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 14,
              appearance: 'none', WebkitAppearance: 'none',
            }}
          >
            <option value="">— Select destination —</option>
            {destinations.map(wp => (
              <option key={wp.id} value={wp.id}>
                {TYPE_ICONS[wp.waypoint_type] ?? '📍'} {wp.label}
              </option>
            ))}
          </select>
        </div>

        {/* Get Directions button */}
        <button
          onClick={handleGetDirections}
          disabled={!toId || loading}
          style={{
            width: '100%', padding: '12px', background: toId && !loading ? MERLOT : '#2A2A38',
            color: WHITE, border: 'none', borderRadius: 8, fontSize: 15,
            fontWeight: 600, cursor: toId && !loading ? 'pointer' : 'not-allowed',
            marginBottom: 20, transition: 'background 0.15s',
          }}
        >
          {loading ? 'Computing path…' : 'Get Directions'}
        </button>

        {/* SVG floor plan */}
        {waypoints.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: GRAY, fontSize: 11, margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Floor Plan
            </p>
            <svg
              viewBox="0 0 100 100"
              style={{ width: '100%', height: 220, background: '#0F0F1A', borderRadius: 12, display: 'block', border: `1px solid ${BORDER}` }}
            >
              {/* Subtle grid */}
              <line x1="0" y1="50" x2="100" y2="50" stroke="#1E1E2E" strokeWidth="0.5" />
              <line x1="50" y1="0" x2="50" y2="100" stroke="#1E1E2E" strokeWidth="0.5" />

              {/* Path dotted line */}
              {path.length > 1 && (
                <polyline
                  points={path
                    .map(id => {
                      const wp = waypointMap.get(id);
                      if (!wp) return null;
                      return `${parseFloat(wp.x_position)},${parseFloat(wp.y_position)}`;
                    })
                    .filter((p): p is string => p !== null)
                    .join(' ')}
                  fill="none"
                  stroke={MERLOT_LIGHT}
                  strokeWidth="1.5"
                  strokeDasharray="3,2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Waypoint nodes */}
              {waypoints.map(wp => {
                const x = parseFloat(wp.x_position);
                const y = parseFloat(wp.y_position);
                const isOnPath = path.includes(wp.id);
                const isCurrent = navigating && directions[currentStep]?.waypointId === wp.id;
                const color = TYPE_COLORS[wp.waypoint_type] ?? '#94A3B8';

                return (
                  <g key={wp.id}>
                    {isCurrent && (
                      <circle cx={x} cy={y} r={7} fill={MERLOT} opacity={0.25} />
                    )}
                    <circle
                      cx={x} cy={y}
                      r={isCurrent ? 3.5 : isOnPath ? 2.8 : 1.8}
                      fill={isCurrent ? MERLOT : isOnPath ? color : '#2A2A38'}
                      stroke={isCurrent ? MERLOT_LIGHT : color}
                      strokeWidth={0.8}
                      opacity={isOnPath || isCurrent ? 1 : 0.3}
                    />
                    {(isOnPath || isCurrent) && (
                      <text
                        x={x + 4}
                        y={y + 1.2}
                        fontSize="3"
                        fill={isCurrent ? MERLOT_LIGHT : '#9CA3AF'}
                        dominantBaseline="middle"
                      >
                        {wp.label.length > 9 ? `${wp.label.slice(0, 8)}…` : wp.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Arrived confirmation */}
        {arrived && (
          <div style={{
            background: '#0D1F14', border: '1px solid #4ADE80', borderRadius: 12,
            padding: '24px 20px', textAlign: 'center', marginBottom: 20,
          }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <p style={{ color: '#4ADE80', fontWeight: 700, fontSize: 20, margin: 0 }}>
              You have arrived!
            </p>
            <p style={{ color: GRAY, fontSize: 13, margin: '6px 0 16px' }}>
              {waypointMap.get(toId)?.label ?? 'Destination'}
            </p>
            <button
              onClick={resetNav}
              style={{
                padding: '8px 22px', background: CARD, color: WHITE,
                border: `1px solid ${BORDER}`, borderRadius: 8,
                fontSize: 13, cursor: 'pointer',
              }}
            >
              New Navigation
            </button>
          </div>
        )}

        {/* Step-by-step directions */}
        {navigating && !arrived && directions.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ color: GRAY, fontSize: 11, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Directions
              </p>
              <span style={{ color: MERLOT_LIGHT, fontSize: 12, fontWeight: 600 }}>
                Step {currentStep + 1} / {directions.length}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {directions.map((dir, i) => {
                const isCurrent = i === currentStep;
                const isDone = i < currentStep;
                const wp = waypointMap.get(dir.waypointId);
                const icon = wp ? (TYPE_ICONS[wp.waypoint_type] ?? '📍') : '📍';

                return (
                  <div
                    key={dir.waypointId}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 14px',
                      background: isCurrent ? '#2A1520' : isDone ? '#111118' : CARD,
                      border: `1px solid ${isCurrent ? MERLOT : BORDER}`,
                      borderRadius: 10, opacity: isDone ? 0.5 : 1,
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: isCurrent ? MERLOT : isDone ? '#333' : '#242430',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isDone ? 13 : 12, color: WHITE, fontWeight: 700,
                    }}>
                      {isDone ? '✓' : dir.step}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: isCurrent ? WHITE : GRAY, fontSize: 14, margin: 0,
                        fontWeight: isCurrent ? 600 : 400,
                      }}>
                        {dir.instruction}
                      </p>
                      {wp && (
                        <span style={{ color: '#4B5563', fontSize: 11 }}>
                          {icon} {wp.waypoint_type.charAt(0).toUpperCase() + wp.waypoint_type.slice(1)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleNextStep}
              style={{
                width: '100%', padding: '12px', background: MERLOT,
                color: WHITE, border: 'none', borderRadius: 8, fontSize: 15,
                fontWeight: 600, cursor: 'pointer',
              }}
            >
              {currentStep >= directions.length - 1 ? 'Mark Arrived ✓' : 'Next Step →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
