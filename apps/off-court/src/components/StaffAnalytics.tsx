import { useState } from 'react';

interface StaffRecord {
  staff_id: string;
  staff_name?: string;
  zones_covered: number;
  idle_time_minutes: number;
  task_completion_rate: number | null;
  peak_activity_hour: number | null;
  total_distance_m?: number;
}

interface StaffAnalyticsProps {
  venueId: string;
  initialDate?: string;
}

const BG = '#0D0D11';
const CARD = '#18181F';
const AMBER = '#F59E0B';
const WHITE = '#FFFFFF';
const GRAY = '#6B7280';
const BORDER_DIM = '#2a2a38';
const TRACK = '#2a2a38';

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function activityScore(staff: StaffRecord): number {
  const taskRate = staff.task_completion_rate ?? 0;
  const idlePenalty = Math.min(staff.idle_time_minutes / 60, 1);
  const zoneScore = Math.min(staff.zones_covered / 10, 1);
  return Math.round((taskRate * 0.5 + zoneScore * 0.3 + (1 - idlePenalty) * 0.2) * 100);
}

function hourLabel(h: number | null): string {
  if (h === null) return '—';
  const suffix = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${suffix}`;
}

function DonutRing({ rate }: { rate: number | null }) {
  const pct = rate != null ? Math.round(rate * 100) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx={36} cy={36} r={r} fill="none" stroke={TRACK} strokeWidth={8} />
        <circle
          cx={36}
          cy={36}
          r={r}
          fill="none"
          stroke={AMBER}
          strokeWidth={8}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x={36} y={40} textAnchor="middle" fill={WHITE} fontSize={14} fontWeight={700}>
          {pct}%
        </text>
      </svg>
      <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase', letterSpacing: '1px' }}>
        task rate
      </div>
    </div>
  );
}

function StaffCard({ staff }: { staff: StaffRecord }) {
  const score = activityScore(staff);

  return (
    <div
      style={{
        backgroundColor: CARD,
        borderRadius: 16,
        padding: '20px 18px',
        border: `1px solid ${BORDER_DIM}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>
            {staff.staff_name ?? staff.staff_id.slice(0, 8)}
          </div>
          <div style={{ fontSize: 12, color: GRAY, marginTop: 2 }}>
            Peak: {hourLabel(staff.peak_activity_hour)}
          </div>
        </div>
        <DonutRing rate={staff.task_completion_rate} />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: GRAY }}>Activity score</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: AMBER }}>{score}</span>
        </div>
        <div style={{ height: 6, backgroundColor: TRACK, borderRadius: 3, overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${score}%`,
              backgroundColor: AMBER,
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <StatPill label="Zones" value={String(staff.zones_covered)} />
        <StatPill label="Idle" value={`${staff.idle_time_minutes}m`} />
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#1e1e2a',
        borderRadius: 10,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
      }}
    >
      <div style={{ fontSize: 17, fontWeight: 700, color: WHITE }}>{value}</div>
      <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase', letterSpacing: '1px' }}>
        {label}
      </div>
    </div>
  );
}

export function StaffAnalytics({ venueId, initialDate }: StaffAnalyticsProps) {
  const [date, setDate] = useState(initialDate ?? todayStr());
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchAnalytics(d: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/staff/analytics?venue_id=${venueId}&date=${d}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const rows = (await res.json()) as StaffRecord[];
      setStaffList(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const d = e.target.value;
    setDate(d);
    void fetchAnalytics(d);
  }

  return (
    <div
      style={{
        backgroundColor: BG,
        minHeight: '100vh',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ maxWidth: 420, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: WHITE }}>Staff Movement</div>
            <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>Ops analytics</div>
          </div>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: AMBER,
              boxShadow: `0 0 8px ${AMBER}`,
            }}
          />
        </div>

        <input
          type="date"
          value={date}
          onChange={handleDateChange}
          style={{
            backgroundColor: CARD,
            border: `1px solid ${BORDER_DIM}`,
            borderRadius: 10,
            color: WHITE,
            fontSize: 14,
            padding: '12px 14px',
            width: '100%',
            boxSizing: 'border-box',
            outline: 'none',
          }}
        />

        {loading && (
          <div style={{ textAlign: 'center', color: GRAY, padding: '32px 0', fontSize: 14 }}>
            Loading...
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: '#2a1a1a',
              border: '1px solid #ef444433',
              borderRadius: 10,
              color: '#EF4444',
              fontSize: 13,
              padding: '12px 14px',
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && staffList.length === 0 && (
          <div style={{ textAlign: 'center', color: GRAY, padding: '32px 0', fontSize: 14 }}>
            No staff data for this date.
          </div>
        )}

        {staffList.map((staff) => (
          <StaffCard key={staff.staff_id} staff={staff} />
        ))}
      </div>
    </div>
  );
}
