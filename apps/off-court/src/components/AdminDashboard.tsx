import { useEffect, useState } from 'react';
import { Link } from 'wouter';

const BG      = '#0D0D0D';
const CARD    = '#161616';
const BORDER  = '#242424';
const MERLOT  = '#6B2737';
const MERLOT2 = '#8B3347';
const GREEN   = '#4ADE80';
const RED     = '#F87171';
const WHITE   = '#F5F5F5';
const MUTED   = '#737373';
const GRAY    = '#404040';

interface SystemHealth {
  api: boolean;
  database: boolean;
  redis: boolean;
  whatsapp: boolean;
}

interface QuickStats {
  totalMembers: number;
  bookingsToday: number;
  revenueToday: number;
  activeCourts: number;
}

interface ActivityEvent {
  id: string;
  type: 'booking' | 'checkin' | 'order' | 'member';
  description: string;
  timestamp: string;
}

const SHORTCUTS = [
  { label: 'CRM',        icon: '👥', path: '/crm'        },
  { label: 'Finance',    icon: '💰', path: '/finance'     },
  { label: 'Compliance', icon: '🛡️', path: '/compliance'  },
  { label: 'Staff',      icon: '🧑‍💼', path: '/staff'      },
  { label: 'Displays',   icon: '📺', path: '/displays'    },
  { label: 'IFC Upload', icon: '📐', path: '/ifc'         },
] as const;

function HealthDot({ ok }: { ok: boolean }) {
  return (
    <span style={{
      display: 'inline-block',
      width: '0.5rem',
      height: '0.5rem',
      borderRadius: '50%',
      background: ok ? GREEN : RED,
      boxShadow: ok ? `0 0 6px ${GREEN}88` : `0 0 6px ${RED}88`,
      flexShrink: 0,
    }} />
  );
}

function HealthCard({ label, ok }: { label: string; ok: boolean | null }) {
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: '0.75rem',
      padding: '0.875rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '0.5rem',
    }}>
      <span style={{ color: MUTED, fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.04em' }}>
        {label}
      </span>
      {ok === null
        ? <span style={{ color: GRAY, fontSize: '0.7rem' }}>…</span>
        : <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <HealthDot ok={ok} />
            <span style={{ color: ok ? GREEN : RED, fontSize: '0.7rem', fontWeight: 700 }}>
              {ok ? 'UP' : 'DOWN'}
            </span>
          </div>
      }
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: '0.75rem',
      padding: '1rem',
    }}>
      <div style={{ color: MUTED, fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', marginBottom: '0.375rem' }}>
        {label}
      </div>
      <div style={{ color: WHITE, fontSize: '1.375rem', fontWeight: 700, lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ color: GRAY, fontSize: '0.7rem', marginTop: '0.25rem' }}>{sub}</div>}
    </div>
  );
}

function ShortcutTile({ label, icon, path }: { label: string; icon: string; path: string }) {
  return (
    <Link href={path}>
      <div style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: '0.75rem',
        padding: '1rem 0.75rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = MERLOT2)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
      >
        <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{icon}</span>
        <span style={{ color: MUTED, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.04em', textAlign: 'center' }}>
          {label}
        </span>
      </div>
    </Link>
  );
}

function typeIcon(type: ActivityEvent['type']): string {
  if (type === 'booking')  return '📅';
  if (type === 'checkin')  return '✅';
  if (type === 'order')    return '🛒';
  return '👤';
}

function relativeTime(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmt(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

export default function AdminDashboard() {
  const [health, setHealth]       = useState<SystemHealth | null>(null);
  const [stats, setStats]         = useState<QuickStats | null>(null);
  const [activity, setActivity]   = useState<ActivityEvent[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  async function fetchHealth() {
    try {
      const r = await fetch('/api/auth/health/detailed');
      if (r.ok) setHealth(await r.json() as SystemHealth);
    } catch {
      setHealth({ api: false, database: false, redis: false, whatsapp: false });
    }
  }

  async function fetchStats() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [membersRes, opsRes] = await Promise.all([
        fetch('/api/members?limit=1'),
        fetch(`/api/ops/stats?date=${today}`),
      ]);
      const membersData = membersRes.ok ? (await membersRes.json() as { total?: number }) : null;
      const opsData     = opsRes.ok    ? (await opsRes.json() as { bookings_today?: number; revenue_today?: number; active_courts?: number }) : null;
      setStats({
        totalMembers:  membersData?.total          ?? 0,
        bookingsToday: opsData?.bookings_today     ?? 0,
        revenueToday:  opsData?.revenue_today      ?? 0,
        activeCourts:  opsData?.active_courts      ?? 0,
      });
    } catch {
      // leave stats null — show dashes
    }
  }

  async function fetchActivity() {
    try {
      const r = await fetch('/api/ops/activity?limit=10');
      if (r.ok) setActivity(await r.json() as ActivityEvent[]);
    } catch {
      // leave empty
    }
  }

  useEffect(() => {
    void fetchHealth();
    void fetchStats();
    void fetchActivity();
  }, []);

  function refresh() {
    setHealth(null);
    void fetchHealth();
    void fetchStats();
    void fetchActivity();
    setLastRefresh(new Date());
  }

  const allHealthy = health
    ? health.api && health.database && health.redis && health.whatsapp
    : null;

  return (
    <div style={{
      background: BG,
      minHeight: '100%',
      padding: '1.25rem 1rem 2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      color: WHITE,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '0.06em', color: WHITE }}>
            ADMIN
          </div>
          <div style={{ fontSize: '0.7rem', color: MUTED, marginTop: '0.125rem' }}>
            {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {allHealthy !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <HealthDot ok={allHealthy} />
              <span style={{ fontSize: '0.7rem', color: allHealthy ? GREEN : RED, fontWeight: 700 }}>
                {allHealthy ? 'ALL SYSTEMS UP' : 'DEGRADED'}
              </span>
            </div>
          )}
          <button
            onClick={refresh}
            style={{
              background: MERLOT,
              color: WHITE,
              border: 'none',
              borderRadius: '0.5rem',
              padding: '0.5rem 0.875rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* System Health */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: MUTED, marginBottom: '0.625rem' }}>
          SYSTEM HEALTH
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <HealthCard label="API"       ok={health?.api       ?? null} />
          <HealthCard label="Database"  ok={health?.database  ?? null} />
          <HealthCard label="Redis"     ok={health?.redis     ?? null} />
          <HealthCard label="WhatsApp"  ok={health?.whatsapp  ?? null} />
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: MUTED, marginBottom: '0.625rem' }}>
          QUICK STATS
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <StatCard label="TOTAL MEMBERS"   value={stats ? String(stats.totalMembers)  : '—'} />
          <StatCard label="BOOKINGS TODAY"  value={stats ? String(stats.bookingsToday) : '—'} />
          <StatCard label="REVENUE TODAY"   value={stats ? fmt(stats.revenueToday)     : '—'} />
          <StatCard label="ACTIVE COURTS"   value={stats ? String(stats.activeCourts)  : '—'} />
        </div>
      </div>

      {/* Management Shortcuts */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: MUTED, marginBottom: '0.625rem' }}>
          MANAGEMENT
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {SHORTCUTS.map((s) => (
            <ShortcutTile key={s.path} label={s.label} icon={s.icon} path={s.path} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: MUTED, marginBottom: '0.625rem' }}>
          RECENT ACTIVITY
        </div>
        <div style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: '0.75rem',
          overflow: 'hidden',
        }}>
          {activity.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: GRAY, fontSize: '0.8rem' }}>
              No recent activity
            </div>
          ) : (
            activity.map((ev, i) => (
              <div
                key={ev.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem 1rem',
                  borderBottom: i < activity.length - 1 ? `1px solid ${BORDER}` : 'none',
                }}
              >
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{typeIcon(ev.type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: WHITE,
                    fontSize: '0.78rem',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {ev.description}
                  </div>
                  <div style={{ color: GRAY, fontSize: '0.68rem', marginTop: '0.125rem' }}>
                    {ev.type.toUpperCase()}
                  </div>
                </div>
                <span style={{ color: MUTED, fontSize: '0.68rem', flexShrink: 0 }}>
                  {relativeTime(ev.timestamp)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
