import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  id: string;
  venue_id: string;
  member_id: string;
  member_name: string;
  sport: string;
  total_games: number;
  total_wins: number;
  win_rate: string | null;
  last_played: string | null;
  opt_in: boolean;
  updated_at: string;
}

const SPORT_EMOJI: Record<string, string> = {
  tennis: '🎾',
  padel: '🏓',
  squash: '🟡',
  badminton: '🏸',
  pickleball: '🥒',
};

const MEDAL: Record<number, { color: string; icon: string }> = {
  0: { color: '#FFD700', icon: '🥇' },
  1: { color: '#C0C0C0', icon: '🥈' },
  2: { color: '#CD7F32', icon: '🥉' },
};

const SPORT_OPTIONS = ['all', 'tennis', 'padel', 'squash', 'badminton', 'pickleball'];

// Demo identity — in production these come from the auth context
const DEMO_VENUE_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_MEMBER_ID = '00000000-0000-0000-0000-000000000002';
const DEMO_MEMBER_NAME = 'You';

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('all');
  const [optedIn, setOptedIn] = useState(false);
  const [toggling, setToggling] = useState(false);

  const activeSport = sport === 'all' ? 'tennis' : sport;

  const loadEntries = (): void => {
    setLoading(true);
    const qs = sport !== 'all' ? `?sport=${encodeURIComponent(sport)}` : '';
    fetch(`/api/leaderboard${qs}`)
      .then((r) => r.json() as Promise<LeaderboardEntry[]>)
      .then((data) => {
        setEntries(data);
        const me = data.find((e) => e.member_id === DEMO_MEMBER_ID);
        setOptedIn(me?.opt_in ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadEntries();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sport]);

  const handleToggle = (): void => {
    setToggling(true);
    const url = optedIn ? '/api/leaderboard/optout' : '/api/leaderboard/optin';
    const body = optedIn
      ? { venue_id: DEMO_VENUE_ID, member_id: DEMO_MEMBER_ID, sport: activeSport }
      : { venue_id: DEMO_VENUE_ID, member_id: DEMO_MEMBER_ID, member_name: DEMO_MEMBER_NAME, sport: activeSport };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(() => {
        setOptedIn((prev) => !prev);
        loadEntries();
        setToggling(false);
      })
      .catch(() => setToggling(false));
  };

  const winPct = (rate: string | null): string => {
    if (!rate) return '0%';
    return `${Math.round(parseFloat(rate) * 100)}%`;
  };

  return (
    <div style={styles.screen}>
      <div style={styles.optInCard}>
        <div style={styles.optInLeft}>
          <div style={styles.optInTitle}>Leaderboard</div>
          <div style={styles.optInSub}>
            Off by default — only opted-in members are shown publicly.
          </div>
        </div>
        <button
          onClick={handleToggle}
          disabled={toggling}
          style={{ ...styles.toggle, ...(optedIn ? styles.toggleOn : styles.toggleOff) }}
        >
          {toggling ? '…' : optedIn ? 'Opted In' : 'Join'}
        </button>
      </div>

      <div style={styles.filterRow}>
        {SPORT_OPTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSport(s)}
            style={{ ...styles.chip, ...(sport === s ? styles.chipActive : {}) }}
          >
            {s === 'all' ? 'All Sports' : `${SPORT_EMOJI[s] ?? ''} ${s}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.center}>Loading…</div>
      ) : entries.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🏆</div>
          <div style={styles.emptyText}>No one on the board yet</div>
          <div style={styles.emptySub}>Be the first to opt in!</div>
        </div>
      ) : (
        <div style={styles.list}>
          {entries.map((entry, idx) => {
            const medal = MEDAL[idx];
            return (
              <div
                key={entry.id}
                style={{
                  ...styles.row,
                  ...(idx === 0 ? styles.rowFirst : {}),
                }}
              >
                <div style={{ ...styles.rank, color: medal?.color ?? '#6b7280' }}>
                  {medal ? medal.icon : `#${idx + 1}`}
                </div>
                <div style={styles.info}>
                  <div style={styles.memberName}>{entry.member_name}</div>
                  <div style={styles.sportTag}>
                    {SPORT_EMOJI[entry.sport] ?? ''} {entry.sport}
                  </div>
                </div>
                <div style={styles.stats}>
                  <div style={styles.winRate}>{winPct(entry.win_rate)}</div>
                  <div style={styles.gamesLabel}>{entry.total_games} games</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  screen: {
    minHeight: '100vh',
    background: '#13131a',
    color: '#e8e8f0',
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: '16px',
  },
  optInCard: {
    background: '#1e1e2e',
    borderRadius: 12,
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    border: '1px solid #2a2a3e',
  },
  optInLeft: {
    flex: 1,
    marginRight: 12,
  },
  optInTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  optInSub: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 1.4,
  },
  toggle: {
    padding: '8px 18px',
    borderRadius: 20,
    border: 'none',
    fontWeight: 600,
    fontSize: 14,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
  toggleOn: {
    background: '#4ade80',
    color: '#0a0a14',
  },
  toggleOff: {
    background: '#2a2a3e',
    color: '#9ca3af',
  },
  filterRow: {
    display: 'flex',
    gap: 8,
    overflowX: 'auto',
    marginBottom: 16,
    paddingBottom: 4,
    scrollbarWidth: 'none',
  },
  chip: {
    background: '#1e1e2e',
    border: '1px solid #2a2a3e',
    borderRadius: 16,
    padding: '6px 14px',
    color: '#9ca3af',
    fontSize: 13,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  chipActive: {
    background: '#4f46e5',
    borderColor: '#4f46e5',
    color: '#fff',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  row: {
    background: '#1e1e2e',
    borderRadius: 10,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    border: '1px solid #2a2a3e',
  },
  rowFirst: {
    border: '1px solid #3b3620',
    background: '#221e14',
  },
  rank: {
    fontSize: 22,
    width: 36,
    textAlign: 'center',
    flexShrink: 0,
    lineHeight: 1,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  memberName: {
    fontWeight: 600,
    fontSize: 15,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sportTag: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 3,
    textTransform: 'capitalize',
  },
  stats: {
    textAlign: 'right',
    flexShrink: 0,
  },
  winRate: {
    fontSize: 20,
    fontWeight: 700,
    color: '#4ade80',
  },
  gamesLabel: {
    fontSize: 11,
    color: '#4b5563',
    marginTop: 2,
  },
  center: {
    textAlign: 'center',
    padding: 40,
    color: '#4b5563',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 600,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    color: '#4b5563',
  },
};
