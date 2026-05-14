import { useLocation } from 'wouter';

interface GameStats {
  power: number;
  accuracy: number;
  speed: number;
  endurance: number;
  technique: number;
}

const SPORT_EMOJIS: Record<string, string> = {
  padel: '🏓', cricket: '🏏', squash: '🔵', badminton: '🏸', tennis: '🎾',
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function MiniSpider({ stats }: { stats: GameStats }) {
  const keys = ['power', 'accuracy', 'speed', 'endurance', 'technique'] as const;
  const n = keys.length;
  const cx = 50, cy = 50, r = 38;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  const outer = keys.map((_, i) => [
    cx + r * Math.cos(angle(i)),
    cy + r * Math.sin(angle(i)),
  ]);
  const mid = outer.map(p => [(p[0]! + cx * 1) / 2, (p[1]! + cy) / 2]);
  const data = keys.map((k, i) => {
    const v = stats[k] / 100;
    return [cx + r * v * Math.cos(angle(i)), cy + r * v * Math.sin(angle(i))];
  });

  const pts = (arr: number[][]) => arr.map(p => p.join(',')).join(' ');

  return (
    <svg width="64" height="64" viewBox="0 0 100 100">
      <polygon points={pts(outer)} fill="none" stroke="#2a2a2a" strokeWidth="1.5" />
      <polygon points={pts(mid)} fill="none" stroke="#2a2a2a" strokeWidth="0.75" />
      {outer.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="#2a2a2a" strokeWidth="0.5" />
      ))}
      <polygon points={pts(data)} fill="rgba(107,39,55,0.45)" stroke="#6B2737" strokeWidth="2" />
    </svg>
  );
}

const DEMO_MEMBER = { name: 'Arjun Mehta', credit_balance: '1250', tier: 'Gold' };
const DEMO_BOOKING = {
  court_name: 'Padel Court A', date: 'Today',
  time_from: '7:00 PM', time_to: '8:30 PM',
  players: ['Arjun M', 'Priya S', 'Kiran R', 'Nisha P'], sport: 'padel',
};
const DEMO_CLASSES = [
  { id: '1', name: 'Morning Yoga', instructor: 'Asha K', time: '7:00 AM', duration_min: 60, spots_left: 3 },
  { id: '2', name: 'HIIT Circuit', instructor: 'Dev P', time: '6:00 PM', duration_min: 45, spots_left: 8 },
];
const DEMO_RESULT = {
  sport: 'padel', date: 'Yesterday', score_self: 6, score_opp: 4, won: true,
  stats: { power: 72, accuracy: 68, speed: 81, endurance: 65, technique: 74 },
};
const STREAK = 3;

const QUICK_ACTIONS = [
  { label: 'Book Court', emoji: '🎾', path: '/book', bg: '#6B2737' },
  { label: 'Find Game', emoji: '⚔️', path: '/findgame', bg: '#1a1a2e' },
  { label: 'Events', emoji: '🏆', path: '/events', bg: '#1a2a1a' },
  { label: 'Wellness', emoji: '🧘', path: '/wellness', bg: '#2a1e1a' },
];

const s = {
  page: {
    background: '#0d0d0d', minHeight: '100%',
    padding: '1.375rem 1rem 1.5rem',
    color: '#f5f5f5', fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#1a1a1a', borderRadius: '1rem',
    padding: '1rem', marginBottom: '0.75rem',
  },
  label: {
    fontSize: '0.68rem', fontWeight: 600, color: '#5a5a5a',
    textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: '0.625rem',
  },
} as const;

export default function HomeScreen() {
  const [, navigate] = useLocation();
  const firstName = DEMO_MEMBER.name.split(' ')[0];

  return (
    <div style={s.page}>
      {/* Greeting + credit pill */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.375rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#8a8a8a', marginBottom: '0.2rem' }}>{getGreeting()}</div>
          <div style={{ fontSize: '1.625rem', fontWeight: 800, lineHeight: 1.1 }}>{firstName} 👋</div>
        </div>
        <div style={{
          background: '#6B2737', color: '#fff', borderRadius: '1rem',
          padding: '0.5rem 1.125rem', textAlign: 'center', minWidth: '5rem',
        }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1 }}>
            {parseFloat(DEMO_MEMBER.credit_balance).toFixed(0)}
          </div>
          <div style={{ fontSize: '0.58rem', opacity: 0.8, marginTop: '0.1rem', letterSpacing: '0.06em' }}>CREDITS</div>
        </div>
      </div>

      {/* Next booking */}
      <div style={{ ...s.card, background: '#111120', border: '1px solid #222238', marginBottom: '0.75rem' }}>
        <div style={s.label}>Next Booking</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{
            fontSize: '2rem', width: '3.25rem', height: '3.25rem', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#1a1a30', borderRadius: '0.875rem',
          }}>
            {SPORT_EMOJIS[DEMO_BOOKING.sport] ?? '🎯'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.975rem' }}>{DEMO_BOOKING.court_name}</div>
            <div style={{ color: '#8a8a8a', fontSize: '0.78rem', marginTop: '0.2rem' }}>
              {DEMO_BOOKING.date} · {DEMO_BOOKING.time_from} – {DEMO_BOOKING.time_to}
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              {DEMO_BOOKING.players.map(p => (
                <span key={p} style={{
                  background: '#1e1e38', color: '#b0b0d0', fontSize: '0.65rem',
                  padding: '0.15rem 0.5rem', borderRadius: '999px', fontWeight: 500,
                }}>{p}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quick action grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '0.75rem' }}>
        {QUICK_ACTIONS.map(({ label, emoji, path, bg }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            style={{
              background: bg, border: 'none', borderRadius: '1rem',
              padding: '1.125rem 1rem', display: 'flex',
              flexDirection: 'column', alignItems: 'flex-start',
              gap: '0.625rem', cursor: 'pointer', color: '#f5f5f5',
            }}
          >
            <span style={{ fontSize: '1.875rem', lineHeight: 1 }}>{emoji}</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{label}</span>
          </button>
        ))}
      </div>

      {/* Today's classes */}
      <div style={s.card}>
        <div style={s.label}>Today's Classes</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {DEMO_CLASSES.map(cls => (
            <div key={cls.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#242424', borderRadius: '0.75rem', padding: '0.75rem 0.875rem',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{cls.name}</div>
                <div style={{ color: '#737373', fontSize: '0.72rem', marginTop: '0.1rem' }}>
                  {cls.time} · {cls.duration_min} min · {cls.instructor}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                <span style={{ fontSize: '0.63rem', color: '#8a8a8a' }}>{cls.spots_left} spots left</span>
                <button style={{
                  background: '#6B2737', color: '#fff', border: 'none',
                  borderRadius: '999px', padding: '0.25rem 0.875rem',
                  fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                }}>Join</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Last game result */}
      <div style={s.card}>
        <div style={s.label}>Last Game</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <MiniSpider stats={DEMO_RESULT.stats} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{
                background: DEMO_RESULT.won ? '#0f2e1a' : '#2e0f0f',
                color: DEMO_RESULT.won ? '#4ade80' : '#f87171',
                fontSize: '0.68rem', fontWeight: 700,
                padding: '0.15rem 0.625rem', borderRadius: '999px',
              }}>
                {DEMO_RESULT.won ? 'WIN' : 'LOSS'}
              </span>
              <span style={{ fontSize: '0.72rem', color: '#737373' }}>{DEMO_RESULT.date}</span>
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.03em' }}>
              {DEMO_RESULT.score_self}
              <span style={{ color: '#444', fontSize: '1.375rem', fontWeight: 300, margin: '0 0.25rem' }}>–</span>
              {DEMO_RESULT.score_opp}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#737373', marginTop: '0.25rem' }}>
              {SPORT_EMOJIS[DEMO_RESULT.sport]} {DEMO_RESULT.sport}
            </div>
          </div>
        </div>
      </div>

      {/* Streak */}
      <div style={{
        ...s.card, background: '#0b1e0e', border: '1px solid #163020',
        textAlign: 'center', padding: '1.25rem 1rem',
      }}>
        <div style={{ fontSize: '2.25rem', marginBottom: '0.3rem' }}>🔥</div>
        <div style={{ fontWeight: 800, fontSize: '1.625rem', color: '#4ade80', lineHeight: 1 }}>
          {STREAK} games
        </div>
        <div style={{ color: '#5a8a6a', fontSize: '0.78rem', marginTop: '0.3rem' }}>
          played this week · keep the streak alive!
        </div>
      </div>
    </div>
  );
}
