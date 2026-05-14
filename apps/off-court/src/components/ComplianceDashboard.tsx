import { useState, useEffect } from 'react';

const BG     = '#0D0D11';
const CARD   = '#18181F';
const BORDER = '#2a2a38';
const WHITE  = '#FFFFFF';
const GRAY   = '#6B7280';
const MUTED  = '#9CA3AF';
const GREEN  = '#4ADE80';
const AMBER  = '#F59E0B';
const RED    = '#F87171';

const CHECK_TYPE_ICONS: Record<string, string> = {
  'fire-noc':          '🔥',
  'fssai':             '🍽️',
  'pool-licence':      '🏊',
  'insurance':         '🛡️',
  'electrical-cert':   '⚡',
  'lift-cert':         '🛗',
  'music-licence':     '🎵',
  'gst-registration':  '📋',
};

const ASSET_TYPE_ICONS: Record<string, string> = {
  'court-surface': '🎾',
  'hvac':          '❄️',
  'electrical':    '⚡',
  'plumbing':      '🔧',
  'fire-system':   '🔥',
  'elevator':      '🛗',
  'pool':          '🏊',
};

interface ComplianceCheck {
  id: string;
  venue_id: string;
  check_type: string;
  check_name: string;
  status: string;
  issued_date: string | null;
  expiry_date: string | null;
  issuing_authority: string;
  document_url: string | null;
  notes: string;
  created_at: string;
}

interface PpmSchedule {
  id: string;
  venue_id: string;
  asset_name: string;
  asset_type: string;
  frequency_days: number;
  last_done_at: string | null;
  next_due_at: string;
  assigned_to: string | null;
  status: string;
  created_at: string;
}

type Tab = 'checks' | 'ppm';

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpiryPill({ expiry_date }: { expiry_date: string | null }) {
  const days = daysUntil(expiry_date);
  if (days === null) return <span style={{ color: GRAY, fontSize: 11 }}>No expiry</span>;

  let bg: string;
  let label: string;
  if (days < 0) {
    bg    = RED;
    label = `Expired ${Math.abs(days)}d ago`;
  } else if (days <= 30) {
    bg    = AMBER;
    label = `${days}d left`;
  } else {
    bg    = GREEN;
    label = `${days}d left`;
  }

  return (
    <span style={{
      background: bg + '22',
      color: bg,
      border: `1px solid ${bg}55`,
      borderRadius: 999,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'valid'          ? GREEN :
    status === 'expiring-soon'  ? AMBER :
    status === 'expired'        ? RED   : GRAY;
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: color,
      marginRight: 6,
    }} />
  );
}

function TrafficLight({ valid, expiring, expired }: { valid: number; expiring: number; expired: number }) {
  const total = valid + expiring + expired;
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      padding: '16px 20px',
      display: 'flex',
      gap: 0,
      marginBottom: 16,
    }}>
      {[
        { count: valid,    color: GREEN, label: 'Valid' },
        { count: expiring, color: AMBER, label: 'Expiring' },
        { count: expired,  color: RED,   label: 'Expired' },
      ].map(({ count, color, label }, i) => (
        <div key={label} style={{
          flex: 1,
          textAlign: 'center',
          borderRight: i < 2 ? `1px solid ${BORDER}` : 'none',
          padding: '0 8px',
        }}>
          <div style={{ fontSize: 28, fontWeight: 800, color }}>{count}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{label}</div>
          {total > 0 && (
            <div style={{ fontSize: 10, color: GRAY, marginTop: 2 }}>
              {Math.round((count / total) * 100)}%
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CheckCard({ check }: { check: ComplianceCheck }) {
  const icon = CHECK_TYPE_ICONS[check.check_type] ?? '📄';
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 600, color: WHITE, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {check.check_name}
            </div>
            <ExpiryPill expiry_date={check.expiry_date} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
            <StatusDot status={check.status} />
            <span style={{ color: MUTED, fontSize: 12, textTransform: 'capitalize' }}>
              {check.status.replace('-', ' ')}
            </span>
            <span style={{ color: GRAY, fontSize: 11, marginLeft: 8 }}>
              · {check.issuing_authority}
            </span>
          </div>
          {check.expiry_date && (
            <div style={{ color: GRAY, fontSize: 11, marginTop: 3 }}>
              Expires: {check.expiry_date}
            </div>
          )}
          {check.document_url && (
            <a href={check.document_url} target="_blank" rel="noreferrer"
              style={{ color: '#60A5FA', fontSize: 11, marginTop: 3, display: 'inline-block' }}>
              View document ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function PpmCard({ schedule, onComplete }: { schedule: PpmSchedule; onComplete: (id: string) => void }) {
  const icon    = ASSET_TYPE_ICONS[schedule.asset_type] ?? '🔧';
  const daysLeft = daysUntil(schedule.next_due_at);
  const isOverdue = daysLeft !== null && daysLeft < 0;

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${isOverdue ? RED + '55' : BORDER}`,
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{ fontWeight: 600, color: WHITE, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {schedule.asset_name}
            </div>
            {isOverdue && (
              <span style={{
                background: RED + '22',
                color: RED,
                border: `1px solid ${RED}55`,
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                OVERDUE
              </span>
            )}
          </div>
          <div style={{ color: MUTED, fontSize: 12, marginTop: 3 }}>
            Every {schedule.frequency_days} days
            <span style={{ color: GRAY, marginLeft: 8 }}>·</span>
            <span style={{ color: GRAY, marginLeft: 8 }}>
              {schedule.asset_type.replace('-', ' ')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 5 }}>
            <div>
              <div style={{ color: GRAY, fontSize: 10 }}>LAST DONE</div>
              <div style={{ color: MUTED, fontSize: 12 }}>{schedule.last_done_at ?? '—'}</div>
            </div>
            <div>
              <div style={{ color: GRAY, fontSize: 10 }}>NEXT DUE</div>
              <div style={{ color: isOverdue ? RED : MUTED, fontSize: 12, fontWeight: isOverdue ? 700 : 400 }}>
                {schedule.next_due_at}
              </div>
            </div>
          </div>
          {schedule.status !== 'completed' && (
            <button
              onClick={() => onComplete(schedule.id)}
              style={{
                marginTop: 8,
                background: GREEN + '22',
                color: GREEN,
                border: `1px solid ${GREEN}55`,
                borderRadius: 8,
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Mark done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ComplianceDashboard({ venueId }: { venueId: string }) {
  const [tab, setTab]       = useState<Tab>('checks');
  const [checks, setChecks] = useState<ComplianceCheck[]>([]);
  const [ppms, setPpms]     = useState<PpmSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [cRes, pRes] = await Promise.all([
      fetch(`/api/compliance/checks?venue_id=${venueId}`),
      fetch(`/api/compliance/ppm?venue_id=${venueId}`),
    ]);
    if (cRes.ok) setChecks(await cRes.json() as ComplianceCheck[]);
    if (pRes.ok) setPpms(await pRes.json() as PpmSchedule[]);
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, [venueId]);

  async function handleComplete(id: string) {
    await fetch(`/api/compliance/ppm/${id}/complete`, { method: 'PUT' });
    await loadAll();
  }

  const valid    = checks.filter((c) => c.status === 'valid').length;
  const expiring = checks.filter((c) => c.status === 'expiring-soon').length;
  const expired  = checks.filter((c) => c.status === 'expired').length;

  const groupedChecks: Record<string, ComplianceCheck[]> = {};
  for (const c of checks) {
    const g = groupedChecks[c.status] ?? [];
    g.push(c);
    groupedChecks[c.status] = g;
  }
  const statusOrder = ['expired', 'expiring-soon', 'pending', 'valid'];

  return (
    <div style={{ background: BG, minHeight: '100vh', color: WHITE, fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', padding: '0 0 80px' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 11, color: GRAY, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Club Standards</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>Compliance</div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <TrafficLight valid={valid} expiring={expiring} expired={expired} />

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['checks', 'ppm'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 10,
              border: 'none',
              background: tab === t ? WHITE : CARD,
              color: tab === t ? BG : MUTED,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              letterSpacing: 0.3,
            }}>
              {t === 'checks' ? 'Compliance Checks' : 'PPM Schedule'}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>Loading…</div>
        )}

        {!loading && tab === 'checks' && (
          <>
            {checks.length === 0 && (
              <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>No compliance checks found.</div>
            )}
            {statusOrder.map((status) => {
              const group = groupedChecks[status];
              if (!group || group.length === 0) return null;
              const label =
                status === 'expiring-soon' ? 'Expiring Soon' :
                status.charAt(0).toUpperCase() + status.slice(1);
              return (
                <div key={status}>
                  <div style={{ fontSize: 11, color: GRAY, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                    {label} ({group.length})
                  </div>
                  {group.map((c) => <CheckCard key={c.id} check={c} />)}
                </div>
              );
            })}
          </>
        )}

        {!loading && tab === 'ppm' && (
          <>
            {ppms.length === 0 && (
              <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>No PPM schedules found.</div>
            )}
            {ppms.map((p) => (
              <PpmCard key={p.id} schedule={p} onComplete={handleComplete} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default ComplianceDashboard;
