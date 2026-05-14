import { useState, useEffect } from 'react';

interface StudioClass {
  id: string;
  venue_id: string;
  room_id: string | null;
  instructor_id: string | null;
  title: string;
  description: string | null;
  class_type: string;
  duration_minutes: number;
  max_capacity: number;
  current_bookings: number;
  scheduled_at: string;
  recurring: boolean;
  recurrence_rule: string | null;
  credits_cost: string;
  status: string;
  created_at: string;
}

const DEMO_MEMBER_ID = 'placeholder-member-id';

const CLASS_TYPES = ['all', 'yoga', 'fitness', 'pilates', 'hiit', 'dance', 'kids'] as const;
type ClassTypeFilter = (typeof CLASS_TYPES)[number];

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  yoga:    { label: 'Yoga',    bg: '#1E3A2F', text: '#34D399' },
  fitness: { label: 'Fitness', bg: '#1E1B4B', text: '#818CF8' },
  pilates: { label: 'Pilates', bg: '#2D1B5E', text: '#C084FC' },
  hiit:    { label: 'HIIT',    bg: '#3B1010', text: '#F87171' },
  dance:   { label: 'Dance',   bg: '#1C2D3A', text: '#38BDF8' },
  kids:    { label: 'Kids',    bg: '#2D2010', text: '#FCD34D' },
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

function ClassTypeBadge({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type] ?? { label: type, bg: '#1F2937', text: '#9CA3AF' };
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

function CapacityBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const color = pct >= 100 ? '#6B7280' : pct >= 80 ? '#D97706' : '#10B981';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-neutral-400 mb-1">
        <span>{current} booked</span>
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

export function StudioClasses() {
  const [classList, setClassList] = useState<StudioClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<ClassTypeFilter>('all');
  const [bookedIds, setBookedIds] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState<string | null>(null);

  const load = (type: ClassTypeFilter): void => {
    setLoading(true);
    const url = type === 'all' ? '/api/classes' : `/api/classes?type=${type}`;
    fetch(url)
      .then((r) => r.json() as Promise<StudioClass[]>)
      .then((data) => {
        setClassList(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load(activeType);
  }, [activeType]);

  const handleBook = (classId: string): void => {
    setActing(classId);
    fetch(`/api/classes/${classId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: DEMO_MEMBER_ID }),
    })
      .then((r) => {
        if (r.ok) {
          setBookedIds((prev) => new Set(prev).add(classId));
          load(activeType);
          return;
        }
        return r.json().then((err: { error: string }) => alert(err.error));
      })
      .catch(console.error)
      .finally(() => setActing(null));
  };

  const handleCancel = (classId: string): void => {
    setActing(classId);
    fetch(`/api/classes/${classId}/book`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: DEMO_MEMBER_ID }),
    })
      .then((r) => {
        if (r.ok) {
          setBookedIds((prev) => {
            const next = new Set(prev);
            next.delete(classId);
            return next;
          });
          load(activeType);
        }
      })
      .catch(console.error)
      .finally(() => setActing(null));
  };

  return (
    <div className="min-h-full bg-[#1a1a1a] px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold text-white">Studio Classes</h1>

      {/* Filter chips */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {CLASS_TYPES.map((t) => (
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
          <p className="text-sm text-neutral-400">Loading classes...</p>
        </div>
      ) : classList.length === 0 ? (
        <div className="mt-24 flex flex-col items-center gap-2">
          <p className="text-3xl">🧘</p>
          <p className="text-sm text-neutral-400">No classes scheduled.</p>
          <p className="text-xs text-neutral-600">Check back soon.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {classList.map((cls) => {
            const isFull = cls.current_bookings >= cls.max_capacity;
            const isBooked = bookedIds.has(cls.id);
            const isActing = acting === cls.id;
            const credits = Number(cls.credits_cost);

            return (
              <li key={cls.id} className="rounded-xl bg-[#242424] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <ClassTypeBadge type={cls.class_type} />
                      {cls.recurring && (
                        <span className="text-xs text-neutral-500">Recurring</span>
                      )}
                    </div>
                    <p className="font-semibold text-white leading-tight">{cls.title}</p>
                    {cls.instructor_id && (
                      <p className="mt-0.5 text-xs text-neutral-400">Instructor ID: {cls.instructor_id}</p>
                    )}
                    <p className="mt-0.5 text-xs text-neutral-500">{formatDateTime(cls.scheduled_at)}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
                      <span>{cls.duration_minutes} min</span>
                      <span className="text-[#C2717F] font-medium">{credits} credits</span>
                    </div>
                    {cls.description && (
                      <p className="mt-1 text-xs text-neutral-500 line-clamp-2">{cls.description}</p>
                    )}
                  </div>

                  <div className="shrink-0 flex flex-col items-end gap-2">
                    {isBooked ? (
                      <>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: '#052E16', color: '#34D399' }}
                        >
                          Booked
                        </span>
                        <button
                          onClick={() => handleCancel(cls.id)}
                          disabled={isActing}
                          className="rounded-lg px-3 py-1 text-xs font-medium disabled:opacity-40"
                          style={{ backgroundColor: '#3a1a1a', color: '#F87171' }}
                        >
                          {isActing ? '...' : 'Cancel'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { if (!isFull) handleBook(cls.id); }}
                        disabled={isFull || isActing}
                        className="rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
                        style={{ backgroundColor: isFull ? '#374151' : '#6B2737' }}
                      >
                        {isActing ? '...' : isFull ? 'Full' : 'Book'}
                      </button>
                    )}
                  </div>
                </div>
                <CapacityBar current={cls.current_bookings} max={cls.max_capacity} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
