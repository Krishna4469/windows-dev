import { useState, useEffect } from 'react';

interface Member {
  id: string;
  venue_id: string;
  phone: string;
  name: string;
  email: string | null;
  credit_balance: string;
  tier: string;
  segment: string;
  days_since_last_visit: number;
  referral_code: string | null;
  referred_by_id: string | null;
  whatsapp_opt_in: {
    booking: boolean;
    analytics: boolean;
    events: boolean;
    promotions: boolean;
  };
  preferences: Record<string, unknown>;
  created_at: string;
}

interface Stats {
  total_games: number;
  total_wins: number;
  win_rate: number;
  favourite_sport: string | null;
  total_credits_spent: number;
}

interface Crew {
  id: string;
  name: string;
  sport: string;
  description: string | null;
  role: string;
  joined_at: string;
}

interface ProfileProps {
  memberId?: string;
}

const SPORT_EMOJIS: Record<string, string> = {
  tennis: '🎾',
  padel: '🏓',
  squash: '🔵',
  badminton: '🏸',
  pickleball: '🥒',
};

const s = {
  page: {
    background: '#0d0d0d',
    minHeight: '100vh',
    padding: '1rem',
    color: '#f5f5f5',
    fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#1a1a1a',
    borderRadius: '1rem',
    padding: '1rem',
    marginBottom: '0.75rem',
  },
  sectionLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#6b6b6b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: '0.75rem',
  },
  innerCard: {
    background: '#242424',
    borderRadius: '0.625rem',
    padding: '0.625rem 0.875rem',
  },
  divider: {
    borderBottom: '1px solid #252525',
  },
  muted: { color: '#737373' },
  centered: { textAlign: 'center' as const },
};

export default function Profile({ memberId = 'placeholder-member-id' }: ProfileProps) {
  const [member, setMember] = useState<Member | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/members/${memberId}`).then(r => r.json()),
      fetch(`/api/members/${memberId}/stats`).then(r => r.json()),
      fetch(`/api/members/${memberId}/crews`).then(r => r.json()),
    ])
      .then(([memberData, statsData, crewsData]: [Member, Stats, Crew[]]) => {
        setMember(memberData);
        setStats(statsData);
        setCrews(crewsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [memberId]);

  const toggleOpt = async (key: keyof Member['whatsapp_opt_in']) => {
    if (!member || saving) return;
    const prev = member.whatsapp_opt_in;
    const updated = { ...prev, [key]: !prev[key] };
    setMember({ ...member, whatsapp_opt_in: updated });
    setSaving(true);
    try {
      await fetch(`/api/members/${memberId}/preferences`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp_opt_in: updated }),
      });
    } catch {
      setMember(m => m ? { ...m, whatsapp_opt_in: prev } : m);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ ...s.page, display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}>
        <span style={s.muted}>Loading profile…</span>
      </div>
    );
  }

  if (!member) {
    return (
      <div style={{ ...s.page, display: 'flex', justifyContent: 'center', paddingTop: '3rem' }}>
        <span style={s.muted}>Member not found.</span>
      </div>
    );
  }

  const memberSince = new Date(member.created_at).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });

  return (
    <div style={s.page}>
      {/* Identity card */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '3rem', height: '3rem', borderRadius: '50%',
            background: '#6B2737', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 700, color: '#fff',
          }}>
            {member.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {member.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
              <span style={{
                background: '#6B2737', color: '#fff',
                fontSize: '0.65rem', fontWeight: 600,
                padding: '0.1rem 0.5rem', borderRadius: '999px',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {member.tier}
              </span>
              <span style={{ ...s.muted, fontSize: '0.72rem' }}>since {memberSince}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1 }}>
              {parseFloat(member.credit_balance).toFixed(0)}
            </div>
            <div style={{ ...s.muted, fontSize: '0.68rem', marginTop: '0.15rem' }}>credits</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={s.card}>
          <div style={s.sectionLabel}>Stats</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: stats.favourite_sport ? '0.75rem' : 0 }}>
            <StatCell label="Games" value={String(stats.total_games)} />
            <StatCell label="Wins" value={String(stats.total_wins)} />
            <StatCell label="Win Rate" value={`${stats.win_rate}%`} />
          </div>
          {stats.favourite_sport && (
            <div style={{ ...s.centered, fontSize: '0.78rem', color: '#a3a3a3', borderTop: '1px solid #252525', paddingTop: '0.625rem' }}>
              Favourite sport &nbsp;
              {SPORT_EMOJIS[stats.favourite_sport] ?? ''} <strong>{stats.favourite_sport}</strong>
            </div>
          )}
        </div>
      )}

      {/* Crews */}
      <div style={s.card}>
        <div style={s.sectionLabel}>Crews</div>
        {crews.length === 0 ? (
          <div style={{ ...s.centered, ...s.muted, fontSize: '0.875rem', padding: '0.25rem 0' }}>
            Not in any crews yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {crews.map(c => (
              <div key={c.id} style={{ ...s.innerCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </div>
                  <div style={{ ...s.muted, fontSize: '0.72rem', marginTop: '0.1rem' }}>
                    {SPORT_EMOJIS[c.sport] ?? ''} {c.sport}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.68rem', color: '#a3a3a3',
                  background: '#303030', padding: '0.15rem 0.5rem',
                  borderRadius: '999px', flexShrink: 0, marginLeft: '0.5rem',
                }}>
                  {c.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp notification settings */}
      <div style={s.card}>
        <div style={s.sectionLabel}>WhatsApp Notifications</div>
        <ToggleRow
          label="Game Updates"
          description="Booking confirmations & reminders"
          value={member.whatsapp_opt_in.booking}
          onChange={() => toggleOpt('booking')}
          disabled={saving}
        />
        <ToggleRow
          label="Events"
          description="Tournaments and special events"
          value={member.whatsapp_opt_in.events}
          onChange={() => toggleOpt('events')}
          disabled={saving}
        />
        <ToggleRow
          label="Club News"
          description="Venue updates and announcements"
          value={member.whatsapp_opt_in.analytics}
          onChange={() => toggleOpt('analytics')}
          disabled={saving}
        />
        <ToggleRow
          label="Offers"
          description="Promotions and deals"
          value={member.whatsapp_opt_in.promotions}
          onChange={() => toggleOpt('promotions')}
          disabled={saving}
          last
        />
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#6b6b6b', fontSize: '0.7rem', marginTop: '0.2rem' }}>{label}</div>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onChange: () => void;
  disabled: boolean;
  last?: boolean;
}

function ToggleRow({ label, description, value, onChange, disabled, last = false }: ToggleRowProps) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.75rem 0',
      borderBottom: last ? 'none' : '1px solid #252525',
    }}>
      <div style={{ flex: 1, minWidth: 0, paddingRight: '0.75rem' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: '0.72rem', color: '#6b6b6b', marginTop: '0.1rem' }}>{description}</div>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        aria-pressed={value}
        style={{
          width: '2.75rem', height: '1.5rem', borderRadius: '999px',
          background: value ? '#6B2737' : '#363636',
          border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          position: 'relative', flexShrink: 0,
          opacity: disabled ? 0.65 : 1,
          transition: 'background 0.18s',
          padding: 0,
        }}
      >
        <span style={{
          position: 'absolute',
          top: '0.15rem',
          left: value ? '1.35rem' : '0.15rem',
          width: '1.2rem', height: '1.2rem',
          borderRadius: '50%',
          background: '#fff',
          display: 'block',
          transition: 'left 0.18s',
        }} />
      </button>
    </div>
  );
}
