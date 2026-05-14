import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { EventsList } from './EventsList';

interface Event {
  id: string;
  title: string;
  sport: string;
  event_type: string;
  scheduled_at: string;
  duration_minutes: number;
  max_capacity: number;
  current_rsvp: number;
  status: string;
}

interface RsvpEntry {
  id: string;
  event_id: string;
  member_id: string;
  status: string;
  waitlist_position: number | null;
  created_at: string;
}

interface MyRsvpItem {
  event: Event;
  rsvp: RsvpEntry;
}

const DEMO_MEMBER_ID = 'placeholder-member-id';
const IS_ADMIN = false;

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

type Tab = 'upcoming' | 'myrsvps' | 'past';

interface RsvpCardProps {
  item: MyRsvpItem;
  statusBadge: React.ReactNode;
  onSelect: (id: string) => void;
  onCancel: (eventId: string) => void;
  acting: string | null;
}

function RsvpCard({ item, statusBadge, onSelect, onCancel, acting }: RsvpCardProps) {
  const emoji = SPORT_EMOJI[item.event.sport.toLowerCase()] ?? '🏅';
  return (
    <li
      className="rounded-xl bg-[#242424] p-4 active:opacity-70"
      style={{ cursor: 'pointer' }}
      onClick={() => onSelect(item.event.id)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span>{emoji}</span>
            <span className="text-xs font-medium capitalize text-neutral-400">{item.event.sport}</span>
          </div>
          <p className="font-semibold text-white leading-tight">{item.event.title}</p>
          <p className="mt-0.5 text-xs text-neutral-500">{formatDateTime(item.event.scheduled_at)}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          {statusBadge}
          <button
            onClick={(e) => { e.stopPropagation(); onCancel(item.event.id); }}
            disabled={acting === item.event.id}
            className="rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-40"
            style={{ backgroundColor: '#3a1a1a', color: '#F87171' }}
          >
            {acting === item.event.id ? '...' : 'Cancel RSVP'}
          </button>
        </div>
      </div>
    </li>
  );
}

function MyRsvpsTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState<MyRsvpItem[]>([]);
  const [waitlist, setWaitlist] = useState<MyRsvpItem[]>([]);
  const [acting, setActing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/events')
      .then((r) => r.json() as Promise<Event[]>)
      .then((allEvents) =>
        Promise.all(
          allEvents.map((event) =>
            fetch(`/api/events/${event.id}/rsvps`)
              .then((r) => r.json() as Promise<RsvpEntry[]>)
              .then((rsvps) => {
                const mine = rsvps.find((r) => r.member_id === DEMO_MEMBER_ID);
                return mine ? ({ event, rsvp: mine } as MyRsvpItem) : null;
              })
              .catch(() => null),
          ),
        ),
      )
      .then((results) => {
        const items = results.filter((x): x is MyRsvpItem => x !== null);
        setConfirmed(items.filter((x) => x.rsvp.status === 'confirmed'));
        setWaitlist(items.filter((x) => x.rsvp.status === 'waitlist'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCancel = (eventId: string) => {
    setActing(eventId);
    fetch(`/api/events/${eventId}/rsvp`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: DEMO_MEMBER_ID }),
    })
      .then((r) => { if (r.ok) load(); })
      .catch(console.error)
      .finally(() => setActing(null));
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-neutral-400">Loading...</p>
      </div>
    );
  }

  if (confirmed.length === 0 && waitlist.length === 0) {
    return (
      <div className="mt-24 flex flex-col items-center gap-2 px-4">
        <p className="text-3xl">🎟️</p>
        <p className="text-sm text-neutral-400">No RSVPs yet.</p>
        <p className="text-xs text-neutral-600">Browse upcoming events to sign up.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      {confirmed.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Confirmed</p>
          <ul className="flex flex-col gap-3 mb-5">
            {confirmed.map((item) => (
              <RsvpCard
                key={item.event.id}
                item={item}
                acting={acting}
                onSelect={onSelect}
                onCancel={handleCancel}
                statusBadge={
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: '#052E16', color: '#34D399' }}>
                    Confirmed
                  </span>
                }
              />
            ))}
          </ul>
        </>
      )}
      {waitlist.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">Waitlist</p>
          <ul className="flex flex-col gap-3">
            {waitlist.map((item) => (
              <RsvpCard
                key={item.event.id}
                item={item}
                acting={acting}
                onSelect={onSelect}
                onCancel={handleCancel}
                statusBadge={
                  <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: '#451A03', color: '#FCD34D' }}>
                    Waitlist #{item.rsvp.waitlist_position}
                  </span>
                }
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function PastEventsTab({ onSelect }: { onSelect: (id: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const now = new Date();
    fetch('/api/events')
      .then((r) => r.json() as Promise<Event[]>)
      .then((all) => {
        const past = all.filter((e) => {
          const end = new Date(new Date(e.scheduled_at).getTime() + e.duration_minutes * 60 * 1000);
          return end < now || e.status === 'completed' || e.status === 'cancelled';
        });
        setEvents(past);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <p className="text-sm text-neutral-400">Loading...</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="mt-24 flex flex-col items-center gap-2 px-4">
        <p className="text-3xl">🏁</p>
        <p className="text-sm text-neutral-400">No past events yet.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <ul className="flex flex-col gap-3">
        {events.map((event) => {
          const emoji = SPORT_EMOJI[event.sport.toLowerCase()] ?? '🏅';
          const typeBg = TYPE_COLORS[event.event_type] ?? '#374151';
          return (
            <li
              key={event.id}
              className="rounded-xl bg-[#242424] p-4 active:opacity-70"
              style={{ cursor: 'pointer' }}
              onClick={() => onSelect(event.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span>{emoji}</span>
                    <span
                      className="rounded px-2 py-0.5 text-xs font-semibold capitalize text-white"
                      style={{ backgroundColor: typeBg }}
                    >
                      {event.event_type}
                    </span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: '#1C1917', color: '#78716C' }}
                    >
                      {event.status === 'cancelled' ? 'Cancelled' : 'Completed'}
                    </span>
                  </div>
                  <p className="font-semibold text-white leading-tight">{event.title}</p>
                  <p className="mt-0.5 text-xs text-neutral-500">{formatDateTime(event.scheduled_at)}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {event.current_rsvp} attended · {event.max_capacity} capacity
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'myrsvps', label: 'My RSVPs' },
  { id: 'past', label: 'Past' },
];

export function EventsPage() {
  const [tab, setTab] = useState<Tab>('upcoming');
  const [, navigate] = useLocation();

  return (
    <div className="min-h-full bg-[#0d0d0d]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4">
        <h1 className="text-xl font-semibold text-white">Events</h1>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-white transition-opacity"
          style={{ backgroundColor: IS_ADMIN ? '#6B2737' : '#2a2a2a', opacity: IS_ADMIN ? 1 : 0.35 }}
          disabled={!IS_ADMIN}
          onClick={() => IS_ADMIN && alert('Create event — admin only')}
          aria-label="Create event"
        >
          +
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-neutral-800 px-4">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="relative mr-6 pb-2.5 text-sm font-medium transition-colors"
            style={{ color: tab === t.id ? '#ffffff' : '#6B7280' }}
          >
            {t.label}
            {tab === t.id && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full transition-all"
                style={{ backgroundColor: '#6B2737' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === 'upcoming' && (
          <EventsList onSelect={(id) => navigate(`/events/${id}`)} />
        )}
        {tab === 'myrsvps' && (
          <MyRsvpsTab onSelect={(id) => navigate(`/events/${id}`)} />
        )}
        {tab === 'past' && (
          <PastEventsTab onSelect={(id) => navigate(`/events/${id}`)} />
        )}
      </div>
    </div>
  );
}
