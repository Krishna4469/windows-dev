import { useState, useEffect } from 'react';

interface DisplayScreen {
  id: string;
  venue_id: string;
  screen_name: string;
  location_label: string;
  screen_type: string;
  device_id: string;
  current_content_id: string | null;
  status: string;
  created_at: string;
}

interface PushContentForm {
  content_type: string;
  content_data: string;
}

interface ScoreForm {
  room_id: string;
  player1: string;
  player2: string;
  score1: string;
  score2: string;
}

const SCREEN_TYPE_LABELS: Record<string, string> = {
  'court-scoreboard': 'Scoreboard',
  leaderboard: 'Leaderboard',
  menu: 'Menu',
  event: 'Event',
  welcome: 'Welcome',
  wayfinding: 'Wayfinding',
};

const CONTENT_TYPES = ['score', 'leaderboard', 'menu', 'event', 'custom'] as const;

const BADGE_COLORS: Record<string, string> = {
  'court-scoreboard': '#f59e0b',
  leaderboard: '#10b981',
  menu: '#3b82f6',
  event: '#8b5cf6',
  welcome: '#ec4899',
  wayfinding: '#6b7280',
};

export default function DisplayCMS({ venueId }: { venueId: string }) {
  const [screens, setScreens] = useState<DisplayScreen[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeScreen, setActiveScreen] = useState<DisplayScreen | null>(null);
  const [pushForm, setPushForm] = useState<PushContentForm>({ content_type: 'custom', content_data: '{}' });
  const [scoreForm, setScoreForm] = useState<ScoreForm>({ room_id: '', player1: '', player2: '', score1: '0', score2: '0' });
  const [pushError, setPushError] = useState('');
  const [scoreError, setScoreError] = useState('');
  const [pushSuccess, setPushSuccess] = useState(false);
  const [scoreSuccess, setScoreSuccess] = useState(false);

  async function loadScreens() {
    setLoading(true);
    const res = await fetch(`/api/displays?venue_id=${venueId}`);
    const data: DisplayScreen[] = await res.json() as DisplayScreen[];
    setScreens(data);
    setLoading(false);
  }

  useEffect(() => {
    void loadScreens();
  }, [venueId]);

  async function handlePushContent(e: React.FormEvent) {
    e.preventDefault();
    setPushError('');
    setPushSuccess(false);

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(pushForm.content_data) as Record<string, unknown>;
    } catch {
      setPushError('Invalid JSON in content data');
      return;
    }

    const res = await fetch(`/api/displays/${activeScreen!.id}/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_type: pushForm.content_type, content_data: parsed }),
    });

    if (!res.ok) {
      const body = await res.json() as { error: string };
      setPushError(body.error ?? 'Failed to push content');
      return;
    }

    setPushSuccess(true);
    setActiveScreen(null);
    void loadScreens();
  }

  async function handleScorePush(e: React.FormEvent) {
    e.preventDefault();
    setScoreError('');
    setScoreSuccess(false);

    const res = await fetch('/api/displays/score-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id: venueId,
        room_id: scoreForm.room_id,
        score_data: {
          player1: scoreForm.player1,
          player2: scoreForm.player2,
          score1: Number(scoreForm.score1),
          score2: Number(scoreForm.score2),
          updated_at: new Date().toISOString(),
        },
      }),
    });

    if (!res.ok) {
      const body = await res.json() as { error: string };
      setScoreError(body.error ?? 'Failed to push score');
      return;
    }

    setScoreSuccess(true);
    setScoreForm({ room_id: '', player1: '', player2: '', score1: '0', score2: '0' });
  }

  const courtScreens = screens.filter((s) => s.screen_type === 'court-scoreboard');

  return (
    <div style={{ background: '#1a1a2e', minHeight: '100vh', padding: '24px', fontFamily: 'system-ui, sans-serif', color: '#e5e5e5' }}>
      <h1 style={{ color: '#f59e0b', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Display CMS</h1>
      <p style={{ color: '#9ca3af', marginBottom: '28px', fontSize: '14px' }}>Manage venue screens and push live content</p>

      {/* Screen List */}
      <section style={{ marginBottom: '36px' }}>
        <h2 style={{ color: '#d1d5db', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Registered Screens</h2>

        {loading && <p style={{ color: '#6b7280' }}>Loading...</p>}

        {!loading && screens.length === 0 && (
          <p style={{ color: '#6b7280', fontSize: '14px' }}>No screens registered yet.</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {screens.map((screen) => (
            <div
              key={screen.id}
              style={{
                background: '#16213e',
                border: `1px solid ${activeScreen?.id === screen.id ? '#f59e0b' : '#2d3748'}`,
                borderRadius: '10px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{screen.screen_name}</span>
                <span
                  style={{
                    background: BADGE_COLORS[screen.screen_type] ?? '#6b7280',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    padding: '2px 8px',
                  }}
                >
                  {SCREEN_TYPE_LABELS[screen.screen_type] ?? screen.screen_type}
                </span>
              </div>
              <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '4px' }}>{screen.location_label}</p>
              <p style={{ color: '#6b7280', fontSize: '12px', marginBottom: '12px' }}>
                Device: <span style={{ color: '#d1d5db' }}>{screen.device_id}</span>
              </p>
              <p style={{ fontSize: '12px', color: screen.current_content_id ? '#10b981' : '#6b7280', marginBottom: '12px' }}>
                {screen.current_content_id ? 'Content loaded' : 'No content'}
              </p>
              <button
                onClick={() => { setActiveScreen(screen); setPushError(''); setPushSuccess(false); }}
                style={{
                  background: '#f59e0b',
                  color: '#1a1a2e',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Push Content
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Push Content Modal */}
      {activeScreen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setActiveScreen(null); }}
        >
          <div style={{ background: '#16213e', border: '1px solid #f59e0b', borderRadius: '12px', padding: '28px', width: '420px', maxWidth: '90vw' }}>
            <h3 style={{ color: '#f59e0b', marginBottom: '4px', fontSize: '16px', fontWeight: 700 }}>Push Content</h3>
            <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px' }}>{activeScreen.screen_name} — {activeScreen.location_label}</p>

            <form onSubmit={(e) => { void handlePushContent(e); }}>
              <label style={{ display: 'block', marginBottom: '14px' }}>
                <span style={{ fontSize: '13px', color: '#d1d5db', display: 'block', marginBottom: '6px' }}>Content Type</span>
                <select
                  value={pushForm.content_type}
                  onChange={(e) => setPushForm({ ...pushForm, content_type: e.target.value })}
                  style={{ width: '100%', background: '#1a1a2e', border: '1px solid #374151', color: '#e5e5e5', borderRadius: '6px', padding: '8px 10px', fontSize: '14px' }}
                >
                  {CONTENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'block', marginBottom: '16px' }}>
                <span style={{ fontSize: '13px', color: '#d1d5db', display: 'block', marginBottom: '6px' }}>Content Data (JSON)</span>
                <textarea
                  value={pushForm.content_data}
                  onChange={(e) => setPushForm({ ...pushForm, content_data: e.target.value })}
                  rows={5}
                  style={{ width: '100%', background: '#1a1a2e', border: '1px solid #374151', color: '#e5e5e5', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </label>

              {pushError && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{pushError}</p>}
              {pushSuccess && <p style={{ color: '#10b981', fontSize: '13px', marginBottom: '12px' }}>Content pushed successfully</p>}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{ flex: 1, background: '#f59e0b', color: '#1a1a2e', border: 'none', borderRadius: '6px', padding: '9px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
                >
                  Push
                </button>
                <button
                  type="button"
                  onClick={() => setActiveScreen(null)}
                  style={{ flex: 1, background: 'transparent', color: '#9ca3af', border: '1px solid #374151', borderRadius: '6px', padding: '9px', fontSize: '14px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Score Push */}
      <section>
        <h2 style={{ color: '#d1d5db', fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Live Score Push</h2>
        <div style={{ background: '#16213e', border: '1px solid #2d3748', borderRadius: '10px', padding: '20px', maxWidth: '440px' }}>
          {courtScreens.length === 0 && (
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>No court scoreboard screens registered.</p>
          )}
          <form onSubmit={(e) => { void handleScorePush(e); }}>
            <label style={{ display: 'block', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#d1d5db', display: 'block', marginBottom: '6px' }}>Court / Room ID</span>
              <input
                value={scoreForm.room_id}
                onChange={(e) => setScoreForm({ ...scoreForm, room_id: e.target.value })}
                placeholder="room UUID or label"
                style={{ width: '100%', background: '#1a1a2e', border: '1px solid #374151', color: '#e5e5e5', borderRadius: '6px', padding: '8px 10px', fontSize: '14px', boxSizing: 'border-box' }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <label>
                <span style={{ fontSize: '13px', color: '#d1d5db', display: 'block', marginBottom: '6px' }}>Player 1</span>
                <input
                  value={scoreForm.player1}
                  onChange={(e) => setScoreForm({ ...scoreForm, player1: e.target.value })}
                  placeholder="Name"
                  style={{ width: '100%', background: '#1a1a2e', border: '1px solid #374151', color: '#e5e5e5', borderRadius: '6px', padding: '8px 10px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </label>
              <label>
                <span style={{ fontSize: '13px', color: '#d1d5db', display: 'block', marginBottom: '6px' }}>Player 2</span>
                <input
                  value={scoreForm.player2}
                  onChange={(e) => setScoreForm({ ...scoreForm, player2: e.target.value })}
                  placeholder="Name"
                  style={{ width: '100%', background: '#1a1a2e', border: '1px solid #374151', color: '#e5e5e5', borderRadius: '6px', padding: '8px 10px', fontSize: '14px', boxSizing: 'border-box' }}
                />
              </label>
              <label>
                <span style={{ fontSize: '13px', color: '#d1d5db', display: 'block', marginBottom: '6px' }}>Score 1</span>
                <input
                  type="number"
                  min={0}
                  value={scoreForm.score1}
                  onChange={(e) => setScoreForm({ ...scoreForm, score1: e.target.value })}
                  style={{ width: '100%', background: '#1a1a2e', border: '1px solid #374151', color: '#f59e0b', borderRadius: '6px', padding: '8px 10px', fontSize: '20px', fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }}
                />
              </label>
              <label>
                <span style={{ fontSize: '13px', color: '#d1d5db', display: 'block', marginBottom: '6px' }}>Score 2</span>
                <input
                  type="number"
                  min={0}
                  value={scoreForm.score2}
                  onChange={(e) => setScoreForm({ ...scoreForm, score2: e.target.value })}
                  style={{ width: '100%', background: '#1a1a2e', border: '1px solid #374151', color: '#f59e0b', borderRadius: '6px', padding: '8px 10px', fontSize: '20px', fontWeight: 700, textAlign: 'center', boxSizing: 'border-box' }}
                />
              </label>
            </div>

            {scoreError && <p style={{ color: '#ef4444', fontSize: '13px', marginBottom: '10px' }}>{scoreError}</p>}
            {scoreSuccess && <p style={{ color: '#10b981', fontSize: '13px', marginBottom: '10px' }}>Score pushed to court screen</p>}

            <button
              type="submit"
              style={{ width: '100%', background: '#f59e0b', color: '#1a1a2e', border: 'none', borderRadius: '6px', padding: '10px', fontWeight: 700, fontSize: '14px', cursor: 'pointer' }}
            >
              Push Live Score
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
