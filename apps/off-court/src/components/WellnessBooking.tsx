import { useState, useEffect } from 'react';

interface Treatment {
  id: string;
  venue_id: string;
  room_id: string | null;
  name: string;
  description: string | null;
  treatment_type: string;
  duration_minutes: number;
  credits_cost: string;
  therapist_name: string | null;
  max_daily_slots: number;
  status: string;
  created_at: string;
}

interface Combo {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  treatment_ids: string[];
  total_credits: string;
  discount_percent: string;
  created_at: string;
}

const DEMO_MEMBER_ID = 'placeholder-member-id';

type ActiveTab = 'treatments' | 'combos';
type TreatmentTypeFilter = 'all' | 'massage' | 'facial' | 'physio' | 'recovery' | 'meditation';

const TREATMENT_TYPES: TreatmentTypeFilter[] = ['all', 'massage', 'facial', 'physio', 'recovery', 'meditation'];

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  massage:    { label: 'Massage',    bg: '#2A1A2E', text: '#C084FC' },
  facial:     { label: 'Facial',     bg: '#1E2A2A', text: '#5EEAD4' },
  physio:     { label: 'Physio',     bg: '#1A1E2E', text: '#93C5FD' },
  recovery:   { label: 'Recovery',   bg: '#2A201A', text: '#FCA5A5' },
  meditation: { label: 'Meditation', bg: '#1E2A1E', text: '#86EFAC' },
};

function TreatmentBadge({ type }: { type: string }) {
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

export function WellnessBooking() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('treatments');
  const [typeFilter, setTypeFilter] = useState<TreatmentTypeFilter>('all');
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const loadTreatments = (type: TreatmentTypeFilter): void => {
    setLoading(true);
    const url = type === 'all' ? '/api/wellness/treatments' : `/api/wellness/treatments?type=${type}`;
    fetch(url)
      .then((r) => r.json() as Promise<Treatment[]>)
      .then((data) => { setTreatments(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const loadCombos = (): void => {
    setLoading(true);
    fetch('/api/wellness/combos')
      .then((r) => r.json() as Promise<Combo[]>)
      .then((data) => { setCombos(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    if (activeTab === 'treatments') loadTreatments(typeFilter);
    else loadCombos();
  }, [activeTab, typeFilter]);

  const handleBook = (treatmentId: string): void => {
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 1);
    scheduledAt.setHours(10, 0, 0, 0);
    setActing(treatmentId);
    fetch('/api/wellness/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        treatment_id: treatmentId,
        member_id: DEMO_MEMBER_ID,
        scheduled_at: scheduledAt.toISOString(),
      }),
    })
      .then((r) => {
        if (r.ok) {
          alert('Booked successfully!');
          return;
        }
        return r.json().then((err: { error: string }) => alert(err.error));
      })
      .catch(console.error)
      .finally(() => setActing(null));
  };

  return (
    <div className="min-h-full px-4 py-6" style={{ backgroundColor: '#111118' }}>
      <h1 className="mb-1 text-xl font-semibold text-white">Wellness</h1>
      <p className="mb-5 text-xs" style={{ color: '#9CA3AF' }}>Restore. Recover. Rejuvenate.</p>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl p-1" style={{ backgroundColor: '#1C1C26' }}>
        {(['treatments', 'combos'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 rounded-lg py-2 text-sm font-medium capitalize transition-colors"
            style={
              activeTab === tab
                ? { backgroundColor: '#E9B4BD', color: '#111118' }
                : { color: '#6B7280' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Treatment type filter chips */}
      {activeTab === 'treatments' && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {TREATMENT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className="shrink-0 rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors"
              style={
                typeFilter === t
                  ? { backgroundColor: '#E9B4BD', color: '#111118' }
                  : { backgroundColor: '#1C1C26', color: '#6B7280' }
              }
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <p className="text-sm" style={{ color: '#6B7280' }}>Loading...</p>
        </div>
      ) : activeTab === 'treatments' ? (
        treatments.length === 0 ? (
          <div className="mt-24 flex flex-col items-center gap-2">
            <p className="text-3xl">🌿</p>
            <p className="text-sm" style={{ color: '#6B7280' }}>No treatments available.</p>
            <p className="text-xs" style={{ color: '#4B5563' }}>Check back soon.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {treatments.map((t) => {
              const isActing = acting === t.id;
              const credits = Number(t.credits_cost);
              return (
                <li key={t.id} className="rounded-xl p-4" style={{ backgroundColor: '#18181F' }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1">
                        <TreatmentBadge type={t.treatment_type} />
                      </div>
                      <p className="font-semibold text-white leading-tight">{t.name}</p>
                      {t.therapist_name && (
                        <p className="mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>{t.therapist_name}</p>
                      )}
                      <div className="mt-1 flex items-center gap-3 text-xs" style={{ color: '#6B7280' }}>
                        <span>{t.duration_minutes} min</span>
                        <span className="font-medium" style={{ color: '#E9B4BD' }}>{credits} credits</span>
                      </div>
                      {t.description && (
                        <p className="mt-1 text-xs line-clamp-2" style={{ color: '#6B7280' }}>{t.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleBook(t.id)}
                      disabled={isActing}
                      className="shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-40"
                      style={{ backgroundColor: '#E9B4BD', color: '#111118' }}
                    >
                      {isActing ? '...' : 'Book'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : (
        combos.length === 0 ? (
          <div className="mt-24 flex flex-col items-center gap-2">
            <p className="text-3xl">✨</p>
            <p className="text-sm" style={{ color: '#6B7280' }}>No combos available.</p>
            <p className="text-xs" style={{ color: '#4B5563' }}>Check back soon.</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {combos.map((c) => {
              const total = Number(c.total_credits);
              const discount = Number(c.discount_percent);
              const discounted = discount > 0 ? total * (1 - discount / 100) : null;
              return (
                <li key={c.id} className="rounded-xl p-4" style={{ backgroundColor: '#18181F' }}>
                  <p className="font-semibold text-white leading-tight">{c.name}</p>
                  {c.description && (
                    <p className="mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>{c.description}</p>
                  )}
                  {Array.isArray(c.treatment_ids) && c.treatment_ids.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1">
                      {(c.treatment_ids as string[]).map((tid, i) => (
                        <li key={tid} className="text-xs" style={{ color: '#6B7280' }}>
                          • Treatment {i + 1}: {tid}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    {discounted !== null ? (
                      <>
                        <span className="text-sm line-through" style={{ color: '#4B5563' }}>{total} credits</span>
                        <span className="text-base font-semibold" style={{ color: '#4ADE80' }}>
                          {discounted.toFixed(0)} credits
                        </span>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold"
                          style={{ backgroundColor: '#052E16', color: '#4ADE80' }}
                        >
                          -{discount}%
                        </span>
                      </>
                    ) : (
                      <span className="text-base font-semibold" style={{ color: '#E9B4BD' }}>{total} credits</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
