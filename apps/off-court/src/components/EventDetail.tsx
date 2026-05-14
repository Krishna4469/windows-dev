import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';

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

interface MemberBasic {
  id: string;
  name: string;
}

const DEMO_MEMBER_ID = 'placeholder-member-id';

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

const AVATAR_COLORS = ['#6B2737', '#0369A1', '#7C3AED', '#047857', '#C2410C', '#B45309'];

function avatarColor(memberId: string): string {
  let hash = 0;
  for (const c of memberId) hash = ((hash << 5) - hash) + c.charCodeAt(0);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]!;
}

function avatarInitials(memberId: string): string {
  const clean = memberId.replace(/-/g, '');
  return clean.slice(0, 2).toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CapacityBar({
  confirmed,
  waitlist,
  max,
}: {
  confirmed: number;
  waitlist: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min((confirmed / max) * 100, 100) : 0;
  const barColor = pct >= 100 ? '#6B7280' : pct >= 80 ? '#D97706' : '#10B981';
  return (
    <div>
      <div className="flex justify-between text-xs text-neutral-400 mb-2">
        <span>
          <span style={{ color: '#34D399' }}>{confirmed}</span> confirmed
        </span>
        {waitlist > 0 && (
          <span>
            <span style={{ color: '#FCD34D' }}>{waitlist}</span> waitlisted
          </span>
        )}
        <span>{max} spots</span>
      </div>
      <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  );
}

export function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();

  const [event, setEvent] = useState<Event | null>(null);
  const [rsvps, setRsvps] = useState<RsvpEntry[]>([]);
  const [organiser, setOrganiser] = useState<MemberBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [waitlistOpen, setWaitlistOpen] = useState(false);

  const loadData = () => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/events/${id}`).then((r) => r.json() as Promise<Event>),
      fetch(`/api/events/${id}/rsvps`).then((r) => r.json() as Promise<RsvpEntry[]>),
    ])
      .then(([ev, rs]) => {
        setEvent(ev);
        setRsvps(rs);
        setLoading(false);
        fetch(`/api/members/${ev.organiser_id}`)
          .then((r) => r.json() as Promise<MemberBasic>)
          .then(setOrganiser)
          .catch(() => undefined);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [id]);

  const myRsvp = rsvps.find((r) => r.member_id === DEMO_MEMBER_ID);
  const confirmedRsvps = rsvps.filter((r) => r.status === 'confirmed');
  const waitlistRsvps = rsvps.filter((r) => r.status === 'waitlist');

  const handleRsvp = () => {
    if (!event) return;
    setActing(true);
    fetch(`/api/events/${event.id}/rsvp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: DEMO_MEMBER_ID }),
    })
      .then((r) => { if (r.ok) loadData(); })
      .catch(console.error)
      .finally(() => setActing(false));
  };

  const handleCancel = () => {
    if (!event) return;
    setActing(true);
    fetch(`/api/events/${event.id}/rsvp`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: DEMO_MEMBER_ID }),
    })
      .then((r) => { if (r.ok) loadData(); })
      .catch(console.error)
      .finally(() => setActing(false));
  };

  if (loading) {
    return (
      <div className="min-h-full bg-[#0d0d0d] flex items-center justify-center h-screen">
        <p className="text-sm text-neutral-400">Loading...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-full bg-[#0d0d0d] flex flex-col items-center justify-center h-screen gap-3">
        <p className="text-sm text-neutral-400">Event not found.</p>
        <button onClick={() => navigate('/events')} className="text-sm" style={{ color: '#6B2737' }}>
          Back to Events
        </button>
      </div>
    );
  }

  const isFull = event.current_rsvp >= event.max_capacity;
  const isCancelled = event.status === 'cancelled';
  const emoji = SPORT_EMOJI[event.sport.toLowerCase()] ?? '🏅';
  const typeBg = TYPE_COLORS[event.event_type] ?? '#374151';

  return (
    <div className="min-h-full bg-[#0d0d0d] pb-10">
      {/* Back button */}
      <div className="flex items-center px-4 pt-6 pb-2">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <span className="text-base leading-none">←</span>
          <span>Back</span>
        </button>
      </div>

      <div className="px-4 pt-2">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span
            className="rounded px-2 py-0.5 text-xs font-semibold capitalize text-white"
            style={{ backgroundColor: typeBg }}
          >
            {event.event_type}
          </span>
          <span className="rounded px-2 py-0.5 text-xs font-semibold text-white bg-neutral-700 capitalize">
            {emoji} {event.sport}
          </span>
          {isCancelled && (
            <span
              className="rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{ backgroundColor: '#2C0000', color: '#F87171' }}
            >
              Cancelled
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-3 leading-tight">{event.title}</h1>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-neutral-400 mb-5 leading-relaxed">{event.description}</p>
        )}

        {/* Info card */}
        <div className="rounded-xl bg-[#1a1a1a] p-4 mb-4 flex flex-col gap-3.5">
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">📅</span>
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">Date</p>
              <p className="text-sm text-white">{formatDate(event.scheduled_at)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">🕐</span>
            <div>
              <p className="text-xs text-neutral-500 mb-0.5">Time &amp; Duration</p>
              <p className="text-sm text-white">
                {formatTime(event.scheduled_at)} · {event.duration_minutes} min
              </p>
            </div>
          </div>
          {event.room_id && (
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">📍</span>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Venue Room</p>
                <p className="text-sm text-white">{event.room_id}</p>
              </div>
            </div>
          )}
          {organiser && (
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">👤</span>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Organiser</p>
                <p className="text-sm text-white">{organiser.name}</p>
              </div>
            </div>
          )}
        </div>

        {/* Capacity */}
        <div className="rounded-xl bg-[#1a1a1a] p-4 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">Capacity</p>
          <CapacityBar
            confirmed={confirmedRsvps.length}
            waitlist={waitlistRsvps.length}
            max={event.max_capacity}
          />
        </div>

        {/* RSVP / Cancel */}
        {!isCancelled && (
          <div className="mb-6">
            {myRsvp ? (
              <div className="flex flex-col items-center gap-3">
                {myRsvp.status === 'confirmed' ? (
                  <span
                    className="rounded-full px-3 py-1 text-sm font-semibold"
                    style={{ backgroundColor: '#052E16', color: '#34D399' }}
                  >
                    You're confirmed ✓
                  </span>
                ) : (
                  <span
                    className="rounded-full px-3 py-1 text-sm font-semibold"
                    style={{ backgroundColor: '#451A03', color: '#FCD34D' }}
                  >
                    On waitlist #{myRsvp.waitlist_position}
                  </span>
                )}
                <button
                  onClick={handleCancel}
                  disabled={acting}
                  className="w-full rounded-xl py-3 text-sm font-semibold disabled:opacity-40 transition-opacity"
                  style={{ backgroundColor: '#3a1a1a', color: '#F87171' }}
                >
                  {acting ? 'Cancelling...' : 'Cancel RSVP'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleRsvp}
                disabled={acting}
                className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-40 transition-opacity"
                style={{ backgroundColor: isFull ? '#374151' : '#6B2737' }}
              >
                {acting ? 'Signing up...' : isFull ? 'Join Waitlist' : 'RSVP'}
              </button>
            )}
          </div>
        )}

        {/* Confirmed attendees */}
        {confirmedRsvps.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
              Confirmed ({confirmedRsvps.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {confirmedRsvps.map((r) => (
                <div
                  key={r.id}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: avatarColor(r.member_id) }}
                  title={r.member_id}
                >
                  {avatarInitials(r.member_id)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Waitlist — collapsed by default */}
        {waitlistRsvps.length > 0 && (
          <div>
            <button
              onClick={() => setWaitlistOpen((o) => !o)}
              className="flex items-center justify-between w-full py-2 text-xs font-semibold uppercase tracking-wider text-neutral-500"
            >
              <span>Waitlist ({waitlistRsvps.length})</span>
              <span className="text-xs">{waitlistOpen ? '▲' : '▼'}</span>
            </button>
            {waitlistOpen && (
              <div className="flex flex-wrap gap-2 mt-2">
                {waitlistRsvps.map((r) => (
                  <div
                    key={r.id}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white opacity-50"
                    style={{ backgroundColor: avatarColor(r.member_id) }}
                    title={`Waitlist #${r.waitlist_position ?? ''}`}
                  >
                    {r.waitlist_position}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
