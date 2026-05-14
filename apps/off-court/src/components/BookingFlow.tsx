import { useState, useMemo } from 'react';

const SPORTS = [
  { id: 'padel',     label: 'Padel',     emoji: '🏓', bg: '#0f2010' },
  { id: 'cricket',   label: 'Cricket',   emoji: '🏏', bg: '#10101f' },
  { id: 'squash',    label: 'Squash',    emoji: '🔵', bg: '#1f100a' },
  { id: 'badminton', label: 'Badminton', emoji: '🏸', bg: '#1a1a08' },
] as const;

const ADDONS = [
  { id: 'equipment', label: 'Equipment Rental', price: 150, emoji: '🎒' },
  { id: 'towel',     label: 'Towel Service',    price: 50,  emoji: '🏳️' },
  { id: 'coaching',  label: 'Coaching Session', price: 500, emoji: '👨‍🏫' },
] as const;

const RATE_PER_HOUR = 400;

function buildDays() {
  const now = new Date();
  const day3 = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const mon3 = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    return {
      key: d.toISOString().slice(0, 10),
      label: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : day3[d.getDay()]!,
      date: d.getDate(),
      month: mon3[d.getMonth()]!,
    };
  });
}

function buildSlots() {
  const out: { key: string; label: string; booked: boolean }[] = [];
  // Deterministic "booked" pattern so it doesn't reshuffle on every render
  const bookedSet = new Set([2, 3, 7, 11, 15, 18, 22, 25]);
  let idx = 0;
  for (let h = 6; h < 22; h++) {
    for (const m of [0, 30]) {
      const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
      const period = h < 12 ? 'AM' : 'PM';
      const mm = m === 0 ? '00' : '30';
      out.push({ key: `${h}:${mm}`, label: `${h12}:${mm} ${period}`, booked: bookedSet.has(idx) });
      idx++;
    }
  }
  return out;
}

const DAYS = buildDays();
const SLOTS = buildSlots();

const s = {
  page: {
    background: '#0d0d0d', minHeight: '100%',
    padding: '1.375rem 1rem 5rem',
    color: '#f5f5f5', fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: '#1a1a1a', borderRadius: '1rem',
    padding: '1rem', marginBottom: '0.75rem',
  },
  label: {
    fontSize: '0.68rem', fontWeight: 600, color: '#5a5a5a',
    textTransform: 'uppercase' as const, letterSpacing: '0.09em', marginBottom: '0.75rem',
  },
} as const;

export default function BookingFlow() {
  const [sport, setSport] = useState<string | null>(null);
  const [day, setDay] = useState(DAYS[0]!.key);
  const [slot, setSlot] = useState<string | null>(null);
  const [duration, setDuration] = useState(60);
  const [players, setPlayers] = useState<string[]>(['You']);
  const [addOns, setAddOns] = useState<string[]>([]);
  const [playerInput, setPlayerInput] = useState('');

  const baseCost = useMemo(() => (duration / 60) * RATE_PER_HOUR, [duration]);
  const addOnCost = useMemo(
    () => addOns.reduce((sum, id) => sum + (ADDONS.find(a => a.id === id)?.price ?? 0), 0),
    [addOns]
  );
  const totalCost = baseCost + addOnCost;

  const toggleAddOn = (id: string) =>
    setAddOns(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const addPlayer = () => {
    const name = playerInput.trim();
    if (name && !players.includes(name)) {
      setPlayers(prev => [...prev, name]);
      setPlayerInput('');
    }
  };

  return (
    <div style={s.page}>
      <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1.25rem' }}>Book a Court</div>

      {/* Sport selector */}
      <div style={s.card}>
        <div style={s.label}>Select Sport</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
          {SPORTS.map(sp => {
            const active = sport === sp.id;
            return (
              <button
                key={sp.id}
                onClick={() => setSport(sp.id)}
                style={{
                  background: active ? '#6B2737' : sp.bg,
                  border: `2px solid ${active ? '#a33a50' : 'transparent'}`,
                  borderRadius: '0.875rem', padding: '1.125rem 0.875rem',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                  gap: '0.625rem', cursor: 'pointer', color: '#f5f5f5',
                  transition: 'border-color 0.12s, background 0.12s',
                }}
              >
                <span style={{ fontSize: '2.25rem', lineHeight: 1 }}>{sp.emoji}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{sp.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date picker */}
      <div style={s.card}>
        <div style={s.label}>Date</div>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {DAYS.map(d => {
            const active = day === d.key;
            return (
              <button
                key={d.key}
                onClick={() => setDay(d.key)}
                style={{
                  flexShrink: 0, minWidth: '3.5rem',
                  background: active ? '#6B2737' : '#242424',
                  border: 'none', borderRadius: '0.875rem',
                  padding: '0.625rem 0.75rem', cursor: 'pointer',
                  color: active ? '#fff' : '#8a8a8a', textAlign: 'center',
                  transition: 'background 0.12s',
                }}
              >
                <div style={{ fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {d.label}
                </div>
                <div style={{ fontSize: '1.375rem', fontWeight: 800, lineHeight: 1.1, margin: '0.1rem 0' }}>
                  {d.date}
                </div>
                <div style={{ fontSize: '0.58rem', opacity: 0.65 }}>{d.month}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time slot grid */}
      <div style={s.card}>
        <div style={s.label}>Time Slot</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
          {SLOTS.map(sl => {
            const active = slot === sl.key;
            return (
              <button
                key={sl.key}
                disabled={sl.booked}
                onClick={() => !sl.booked && setSlot(sl.key)}
                style={{
                  background: active ? '#6B2737' : sl.booked ? '#141414' : '#242424',
                  border: `1.5px solid ${active ? '#a33a50' : 'transparent'}`,
                  borderRadius: '0.5rem', padding: '0.45rem 0.25rem',
                  color: sl.booked ? '#2e2e2e' : active ? '#fff' : '#c8c8c8',
                  fontSize: '0.72rem', fontWeight: 500,
                  cursor: sl.booked ? 'default' : 'pointer',
                  textDecoration: sl.booked ? 'line-through' : 'none',
                  transition: 'background 0.1s',
                }}
              >
                {sl.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', fontSize: '0.66rem', color: '#5a5a5a' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '0.75rem', height: '0.75rem', background: '#242424', borderRadius: '2px', display: 'inline-block' }} />
            Available
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '0.75rem', height: '0.75rem', background: '#141414', borderRadius: '2px', display: 'inline-block' }} />
            Booked
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '0.75rem', height: '0.75rem', background: '#6B2737', borderRadius: '2px', display: 'inline-block' }} />
            Selected
          </span>
        </div>
      </div>

      {/* Duration */}
      <div style={s.card}>
        <div style={s.label}>Duration</div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {([60, 90, 120] as const).map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              style={{
                flex: 1, background: duration === d ? '#6B2737' : '#242424',
                border: 'none', borderRadius: '0.75rem',
                padding: '0.75rem 0.5rem', cursor: 'pointer',
                color: duration === d ? '#fff' : '#8a8a8a',
                fontSize: '0.875rem', fontWeight: 600,
                transition: 'background 0.12s',
              }}
            >
              {d} min
            </button>
          ))}
        </div>
      </div>

      {/* Players */}
      <div style={s.card}>
        <div style={s.label}>Players</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
          {players.map(p => (
            <span key={p} style={{
              background: p === 'You' ? '#6B2737' : '#2a2a2a', color: '#f5f5f5',
              borderRadius: '999px', padding: '0.25rem 0.75rem',
              fontSize: '0.78rem', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              {p}
              {p !== 'You' && (
                <button
                  onClick={() => setPlayers(prev => prev.filter(x => x !== p))}
                  style={{
                    background: 'none', border: 'none', color: '#8a8a8a',
                    cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1,
                  }}
                >×</button>
              )}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            value={playerInput}
            onChange={e => setPlayerInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addPlayer(); }}
            placeholder="Add player name…"
            style={{
              flex: 1, background: '#242424', border: '1.5px solid #333',
              borderRadius: '0.625rem', padding: '0.5rem 0.75rem',
              color: '#f5f5f5', fontSize: '0.875rem', outline: 'none',
            }}
          />
          <button
            onClick={addPlayer}
            style={{
              background: '#6B2737', border: 'none', borderRadius: '0.625rem',
              padding: '0.5rem 1rem', color: '#fff', fontSize: '1.25rem',
              cursor: 'pointer', lineHeight: 1,
            }}
          >+</button>
        </div>
      </div>

      {/* Add-ons */}
      <div style={s.card}>
        <div style={s.label}>Add-ons</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ADDONS.map(a => {
            const active = addOns.includes(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggleAddOn(a.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: active ? '#1a0c14' : '#242424',
                  border: `1.5px solid ${active ? '#6B2737' : 'transparent'}`,
                  borderRadius: '0.875rem', padding: '0.875rem', cursor: 'pointer',
                  color: '#f5f5f5', transition: 'border-color 0.12s, background 0.12s',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.375rem' }}>{a.emoji}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{a.label}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <span style={{ color: '#8a8a8a', fontSize: '0.78rem' }}>+{a.price} cr</span>
                  <span style={{
                    width: '1.375rem', height: '1.375rem', borderRadius: '50%',
                    background: active ? '#6B2737' : '#363636',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.78rem', color: '#fff', transition: 'background 0.12s',
                  }}>
                    {active ? '✓' : ''}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cost summary */}
      <div style={{ ...s.card, background: '#0f0f1e', border: '1px solid #1e1e38', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
          <span style={{ color: '#8a8a8a' }}>Court ({duration} min)</span>
          <span>{baseCost} cr</span>
        </div>
        {addOns.map(id => {
          const a = ADDONS.find(x => x.id === id)!;
          return (
            <div key={id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#8a8a8a' }}>{a.label}</span>
              <span>{a.price} cr</span>
            </div>
          );
        })}
        <div style={{
          borderTop: '1px solid #252540', paddingTop: '0.625rem', marginTop: '0.25rem',
          display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '1rem',
        }}>
          <span>Total</span>
          <span style={{ color: '#a33a50' }}>{totalCost} credits</span>
        </div>
      </div>

      {/* Confirm button */}
      <button
        disabled={!sport || !slot}
        style={{
          width: '100%', border: 'none', borderRadius: '1rem', padding: '1rem',
          fontSize: '1rem', fontWeight: 700, letterSpacing: '0.02em',
          background: sport && slot ? '#6B2737' : '#1e1e1e',
          color: sport && slot ? '#fff' : '#444',
          cursor: sport && slot ? 'pointer' : 'not-allowed',
          transition: 'background 0.18s',
        }}
      >
        {sport && slot ? `Confirm Booking · ${totalCost} cr` : 'Select a sport & time to book'}
      </button>
    </div>
  );
}
