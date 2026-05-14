interface LineCallDisplayProps {
  call: 'in-bound' | 'out' | 'let';
  confidence: number;
  distanceFromLine: number;
  onReplay?: () => void;
}

const BG = '#111118';
const CARD = '#18181F';
const GREEN = '#22C55E';
const RED = '#EF4444';
const AMBER = '#F59E0B';
const WHITE = '#FFFFFF';
const GRAY = '#6B7280';
const BORDER_DIM = '#2a2a38';

function callColor(call: 'in-bound' | 'out' | 'let'): string {
  if (call === 'in-bound') return GREEN;
  if (call === 'out') return RED;
  return AMBER;
}

function callLabel(call: 'in-bound' | 'out' | 'let'): string {
  if (call === 'in-bound') return 'IN';
  if (call === 'out') return 'OUT';
  return 'LET';
}

export function LineCallDisplay({ call, confidence, distanceFromLine, onReplay }: LineCallDisplayProps) {
  const color = callColor(call);
  const label = callLabel(call);
  const pct = Math.round(confidence * 100);

  return (
    <div
      style={{
        backgroundColor: BG,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: CARD,
          borderRadius: 20,
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          width: '100%',
          maxWidth: 340,
          border: `1.5px solid ${color}33`,
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 900,
            color,
            letterSpacing: '-2px',
            lineHeight: 1,
          }}
        >
          {label}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 38, fontWeight: 700, color: WHITE }}>{pct}%</div>
          <div
            style={{
              fontSize: 12,
              color: GRAY,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
            }}
          >
            confidence
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ fontSize: 24, fontWeight: 600, color: WHITE }}>
            {distanceFromLine.toFixed(1)} cm
          </div>
          <div
            style={{
              fontSize: 12,
              color: GRAY,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
            }}
          >
            from line
          </div>
        </div>

        <div style={{ height: 1, width: '100%', backgroundColor: BORDER_DIM }} />

        <button
          onClick={onReplay}
          disabled={!onReplay}
          style={{
            backgroundColor: '#1e1e2a',
            border: `1px solid ${color}44`,
            borderRadius: 10,
            color: WHITE,
            fontSize: 15,
            fontWeight: 600,
            padding: '13px 28px',
            cursor: onReplay ? 'pointer' : 'default',
            width: '100%',
            opacity: onReplay ? 1 : 0.45,
          }}
        >
          ▶ Replay
        </button>
      </div>
    </div>
  );
}
