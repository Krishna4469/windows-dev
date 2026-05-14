import { useState, useEffect } from 'react';

interface Event {
  id: string;
  venue_id: string;
  room_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  sport: string;
  scheduled_at: string;
  duration_minutes: number;
  max_capacity: number;
  current_rsvp: number;
  status: string;
  organiser_id: string;
  created_at: string;
}

interface RsvpEntry {
  id: string;
  event_id: string;
  member_id: string;
  status: string;
  waitlist_position: number | null;
  created_at: string;
}

const DEMO_MEMBER_ID = 'placeholder-member-id';

const TYPE_FILTERS = ['all', 'tournament', 'social', 'workshop', 'class'] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const TYPE_COLORS: Record<string, string> = {
  tournament: '#C2410C',
  social: '#0369A1',
  workshop: '#7C3AED',
  class: '#047857',
};

const SPORT_EMOJI: Record<string, string> = {
  tennis: '🎾',
  padel: '🏓',
  squash: '🟡',
  badminton: '🏸',
  pickleball: '🥒',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CapacityBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const color = pct >= 100 ? '#6B7280' : pct >= 80 ? '#D97706' : '#10B981';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-neutral-400 mb-1">
        <span>{current} going</span>
        <span>{max} spots</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-neutral-700">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    upcoming: { label: 'Upcoming', bg: '#052E16', text: '#34D399' },
    full:     { label: 'Full',     bg: '#1C1917', text: '#78716C' },
    cancelled:{ label: 'Cancelled',bg: '#2C0000', text: '#F87171' },
  };
  const s = map[status] ?? map['upcoming']!;
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

function RsvpBadge({ rsvp }: { rsvp: RsvpEntry }) {
  if (rsvp.status === 'confirmed') {
    return (
      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: '#052E16', color: '#34D399' }}>
        Confirmed
      </span>
    );
  }
  return (
    <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: '#451A03', color: '#FCD34D' }}>
      Waitlist #{rsvp.waitlist_position}
    </span>
  );
}

export function EventsList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<TypeFilter>('all');
  const [acting, setActing] = useState<string | null>(null);
  const [rsvpMap, setRsvpMap] = useState<Record<string, RsvpEntry>>({});

  const loadRsvps = (eventIds: string[]): void => {
    Promise.all(
      eventIds.map((id) =>
        fetch(`/api/events/${id}/rsvps`)
          .then((r) => r.json() as Promise<RsvpEntry[]>)
          .then((rsvps) => ({ id, rsvp: rsvps.find((r) => r.member_id === DEMO_MEMBER_ID) }))
          .catch(() => ({ id, rsvp: undefined })),
      ),
    ).then((results) => {
      const map: Record<string, RsvpEntry> = {};
      results.forEach(({ id, rsvp }) => { if (rsvp) map[id] = rsvp; });
      setRsvpMap(map);
    });
  };

  const load = (type: TypeFilter): void => {
    setLoading(true);
    const url = type === 'all' ? '/api/events' : `/api/events?type=${type}`;
    fetch(url)
      .then((r) => r.json() as Promise<Event[]>)
      .then((data) => {
        setEvents(data);
        setLoading(false);
        loadRsvps(data.map((e) => e.id));
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load(activeType);
  }, [activeType]);

  const handleRsvp = (eventId: string): void => {
    setActing(eventId);
    fetch(`/api/events/${eventId}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: DEMO_MEMBER_ID }),
    })
      .then((r) => { if (r.ok) load(activeType); })
      .catch(console.error)
      .finally(() => setActing(null));
  };

  const handleCancel = (eventId: string): void => {
    setActing(eventId);
    fetch(`/api/events/${eventId}/rsvp`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: DEMO_MEMBER_ID }),
    })
      .then((r) => { if (r.ok) load(activeType); })
      .catch(console.error)
      .finally(() => setActing(null));
  };

  return (
    <div className="min-h-full bg-[#1a1a1a] px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-white">Events</h1>

      {/* Filter chips */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className="shrink-0 rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors"
            style={
              activeType === t
                ? { backgroundColor: '#6B2737', color: '#fff' }
                : { backgroundColor: '#2a2a2a', color: '#9CA3AF' }
            }
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm text-neutral-400">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="mt-24 flex flex-col items-center gap-2">
          <p className="text-3xl">🗓️</p>
          <p className="text-sm text-neutral-400">No events scheduled.</p>
          <p className="text-xs text-neutral-600">Check back soon.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {events.map((event) => {
            const isFull = event.current_rsvp >= event.max_capacity;
            const isCancelled = event.status === 'cancelled';
            const isActing = acting === event.id;
            const myRsvp = rsvpMap[event.id];
            const emoji = SPORT_EMOJI[event.sport.toLowerCase()] ?? '🏅';
            const typeBg = TYPE_COLORS[event.event_type] ?? '#374151';
            return (
              <li key={event.id} className="rounded-xl bg-[#242424] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-lg">{emoji}</span>
                      <span
                        className="rounded px-2 py-0.5 text-xs font-semibold capitalize text-white"
                        style={{ backgroundColor: typeBg }}
                      >
                        {event.event_type}
                      </span>
                      <StatusPill status={event.status} />
                    </div>
                    <p className="font-semibold text-white leading-tight">{event.title}</p>
                    <p className="mt-0.5 text-xs text-neutral-400 capitalize">{event.sport}</p>
                    <p className="mt-0.5 text-xs text-neutral-500">{formatDateTime(event.scheduled_at)}</p>
                    {event.description && (
                      <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{event.description}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {myRsvp ? (
                      <>
                        <RsvpBadge rsvp={myRsvp} />
                        <button
                          onClick={() => handleCancel(event.id)}
                          disabled={isActing}
                          className="rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-40"
                          style={{ backgroundColor: '#3a1a1a', color: '#F87171' }}
                        >
                          {isActing ? '...' : 'Cancel'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => !isCancelled && handleRsvp(event.id)}
                        disabled={isCancelled || isActing}
                        className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                        style={{ backgroundColor: isFull ? '#374151' : '#6B2737' }}
                      >
                        {isActing ? '...' : isCancelled ? 'Cancelled' : isFull ? 'Waitlist' : 'RSVP'}
                      </button>
                    )}
                  </div>
                </div>
                <CapacityBar current={event.current_rsvp} max={event.max_capacity} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
