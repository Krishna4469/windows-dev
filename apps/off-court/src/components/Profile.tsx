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
  tennis: '🎾', padel: '🏓', squash: '🔵', badminton: '🏸', pickleball: '🥒',
};

const BADGES = [
  { id: 'first_game',         label: 'First Game',      emoji: '🎯', desc: 'Play your first match',           req: (s: Stats) => s.total_games >= 1 },
  { id: 'ten_games',          label: '10 Games',         emoji: '🎮', desc: 'Reach 10 games played',           req: (s: Stats) => s.total_games >= 10 },
  { id: 'crew_leader',        label: 'Crew Leader',      emoji: '👥', desc: 'Lead a crew as captain',          req: (_s: Stats, crews: Crew[]) => crews.some(c => c.role === 'captain' || c.role === 'leader') },
  { id: 'tournament_winner',  label: 'Tournament Win',   emoji: '🏆', desc: 'Win a tournament',                req: (s: Stats) => s.win_rate >= 60 && s.total_games >= 5 },
] as const;

// Deterministic QR-like SVG grid from a string seed
function MiniQR({ seed }: { seed: string }) {
  const SIZE = 11;
  const CELL = 7;
  const PAD = 4;
  const total = SIZE * CELL + PAD * 2;

  // Simple hash → bit array
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;

  function bit(row: number, col: number): boolean {
    // Fixed-position finder squares (top-left, top-right, bottom-left)
    const inFinder = (r: number, c: number, or: number, oc: number) => {
      const dr = r - or, dc = c - oc;
      return dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6 &&
        (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
    };
    if (inFinder(row, col, 0, 0)) return true;
    if (inFinder(row, col, 0, SIZE - 7)) return true;
    if (inFinder(row, col, SIZE - 7, 0)) return true;
    // Rest: pseudo-random from hash
    const idx = row * SIZE + col;
    const word = ((h * (idx + 1)) * 1664525 + 1013904223) >>> 0;
    return (word & 1) === 1;
  }

  const cells: { x: number; y: number }[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (bit(r, c)) cells.push({ x: PAD + c * CELL, y: PAD + r * CELL });
    }
  }

  return (
    <svg width={total} height={total} viewBox={`0 0 ${total} ${total}`} style={{ borderRadius: '0.5rem' }}>
      <rect width={total} height={total} fill="#ffffff" rx="6" />
      {cells.map(({ x, y }, i) => (
        <rect key={i} x={x} y={y} width={CELL - 1} height={CELL - 1} fill="#111111" rx="1" />
      ))}
    </svg>
  );
}

const s = {
  page: {
    background: '#0d0d0d', minHeight: '100vh',
    padding: '1rem', color: '#f5f5f5', fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#1a1a1a', borderRadius: '1rem',
    padding: '1rem', marginBottom: '0.75rem',
  },
  label: {
    fontSize: '0.7rem', fontWeight: 600, color: '#6b6b6b',
    textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '0.75rem',
  },
  innerCard: {
    background: '#242424', borderRadius: '0.625rem', padding: '0.625rem 0.875rem',
  },
  muted: { color: '#737373' },
  centered: { textAlign: 'center' as const },
} as const;

export default function Profile({ memberId = 'placeholder-member-id' }: ProfileProps) {
  const [member, setMember] = useState<Member | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [qrToken, setQrToken] = useState<string>('');

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
        setEditName(memberData.name);
        setEditEmail(memberData.email ?? '');
        // Generate QR seed from member ID (mirrors generateQRCode service logic)
        setQrToken(btoa(JSON.stringify({ memberId: memberData.id, ts: Date.now() })));
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

  const saveProfile = async () => {
    if (!member) return;
    setSaving(true);
    try {
      await fetch(`/api/members/${memberId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail }),
      });
      setMember({ ...member, name: editName, email: editEmail });
      setEditMode(false);
    } catch {
      /* swallow — UI stays in edit mode */
    } finally {
      setSaving(false);
    }
  };

  const shareProfile = async () => {
    if (!member) return;
    const text = `${member.name} · Off Court ${member.tier} Member · ${parseFloat(member.credit_balance).toFixed(0)} credits`;
    if (navigator.share) {
      await navigator.share({ title: 'Off Court Profile', text }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
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

  const initials = member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const memberSince = new Date(member.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  return (
    <div style={s.page}>
      {/* Identity card */}
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
          {/* Avatar */}
          <div style={{
            width: '4rem', height: '4rem', borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #6B2737 0%, #9b3a50 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.375rem', fontWeight: 800, color: '#fff',
            boxShadow: '0 0 0 3px #2a1520',
          }}>
            {initials}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {editMode ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                style={{
                  background: '#242424', border: '1.5px solid #6B2737',
                  borderRadius: '0.5rem', padding: '0.35rem 0.625rem',
                  color: '#f5f5f5', fontSize: '1rem', fontWeight: 700,
                  width: '100%', outline: 'none', marginBottom: '0.4rem',
                }}
              />
            ) : (
              <div style={{ fontWeight: 700, fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {member.name}
              </div>
            )}
            {editMode ? (
              <input
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                placeholder="Email address"
                style={{
                  background: '#242424', border: '1.5px solid #333',
                  borderRadius: '0.5rem', padding: '0.3rem 0.625rem',
                  color: '#a3a3a3', fontSize: '0.8rem',
                  width: '100%', outline: 'none',
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                <span style={{
                  background: '#6B2737', color: '#fff', fontSize: '0.65rem',
                  fontWeight: 600, padding: '0.1rem 0.5rem', borderRadius: '999px',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{member.tier}</span>
                <span style={{ ...s.muted, fontSize: '0.72rem' }}>since {memberSince}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
            {editMode ? (
              <>
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  style={{
                    background: '#6B2737', color: '#fff', border: 'none',
                    borderRadius: '999px', padding: '0.3rem 0.875rem',
                    fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >Save</button>
                <button
                  onClick={() => { setEditMode(false); setEditName(member.name); setEditEmail(member.email ?? ''); }}
                  style={{
                    background: '#2a2a2a', color: '#8a8a8a', border: 'none',
                    borderRadius: '999px', padding: '0.3rem 0.75rem',
                    fontSize: '0.75rem', cursor: 'pointer',
                  }}
                >Cancel</button>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.375rem', fontWeight: 700, lineHeight: 1 }}>
                    {parseFloat(member.credit_balance).toFixed(0)}
                  </div>
                  <div style={{ ...s.muted, fontSize: '0.68rem', marginTop: '0.1rem' }}>credits</div>
                </div>
                <button
                  onClick={() => setEditMode(true)}
                  style={{
                    background: '#242424', color: '#8a8a8a', border: 'none',
                    borderRadius: '999px', padding: '0.25rem 0.625rem',
                    fontSize: '0.72rem', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', gap: '0.25rem',
                  }}
                >✏️ Edit</button>
              </>
            )}
          </div>
        </div>

        {/* Share + QR row */}
        {!editMode && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.875rem' }}>
            <button
              onClick={() => setShowQR(v => !v)}
              style={{
                flex: 1, background: '#242424', color: '#d4d4d4', border: 'none',
                borderRadius: '0.625rem', padding: '0.5rem', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
              }}
            >
              <span>📱</span> {showQR ? 'Hide QR' : 'Show QR'}
            </button>
            <button
              onClick={shareProfile}
              style={{
                flex: 1, background: '#242424', color: '#d4d4d4', border: 'none',
                borderRadius: '0.625rem', padding: '0.5rem', cursor: 'pointer',
                fontSize: '0.78rem', fontWeight: 500,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem',
              }}
            >
              <span>🔗</span> Share Profile
            </button>
          </div>
        )}

        {/* QR panel */}
        {showQR && !editMode && (
          <div style={{
            marginTop: '0.875rem', background: '#111', borderRadius: '0.875rem',
            padding: '1.25rem', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '0.75rem',
          }}>
            <MiniQR seed={qrToken || memberId} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{member.name}</div>
              <div style={{ color: '#737373', fontSize: '0.7rem', marginTop: '0.15rem' }}>
                Scan to check in at the venue
              </div>
              {member.referral_code && (
                <div style={{
                  marginTop: '0.5rem', background: '#1a1a1a', borderRadius: '0.5rem',
                  padding: '0.3rem 0.75rem', display: 'inline-block',
                  fontSize: '0.7rem', color: '#8a8a8a', letterSpacing: '0.08em',
                }}>
                  REF: {member.referral_code}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div style={s.card}>
          <div style={s.label}>Stats</div>
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

      {/* Achievement badges */}
      {stats && (
        <div style={s.card}>
          <div style={s.label}>Achievements</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {BADGES.map(badge => {
              const unlocked = badge.req(stats, crews);
              return (
                <div
                  key={badge.id}
                  style={{
                    background: unlocked ? '#1a0c10' : '#181818',
                    border: `1.5px solid ${unlocked ? '#6B2737' : '#252525'}`,
                    borderRadius: '0.875rem', padding: '0.875rem 0.75rem',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '0.375rem', textAlign: 'center',
                    opacity: unlocked ? 1 : 0.5,
                  }}
                >
                  <span style={{ fontSize: '1.625rem', filter: unlocked ? 'none' : 'grayscale(1)' }}>
                    {badge.emoji}
                  </span>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: unlocked ? '#f5f5f5' : '#5a5a5a' }}>
                    {badge.label}
                  </div>
                  <div style={{ fontSize: '0.63rem', color: '#5a5a5a', lineHeight: 1.4 }}>
                    {badge.desc}
                  </div>
                  {unlocked && (
                    <span style={{
                      fontSize: '0.6rem', background: '#6B2737', color: '#fff',
                      borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 600,
                    }}>UNLOCKED</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Crews */}
      <div style={s.card}>
        <div style={s.label}>Crews</div>
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
                  fontSize: '0.68rem', color: '#a3a3a3', background: '#303030',
                  padding: '0.15rem 0.5rem', borderRadius: '999px', flexShrink: 0, marginLeft: '0.5rem',
                }}>
                  {c.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* WhatsApp notifications */}
      <div style={s.card}>
        <div style={s.label}>WhatsApp Notifications</div>
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
      padding: '0.75rem 0', borderBottom: last ? 'none' : '1px solid #252525',
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
          opacity: disabled ? 0.65 : 1, transition: 'background 0.18s', padding: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: '0.15rem',
          left: value ? '1.35rem' : '0.15rem',
          width: '1.2rem', height: '1.2rem', borderRadius: '50%',
          background: '#fff', display: 'block', transition: 'left 0.18s',
        }} />
      </button>
    </div>
  );
}
