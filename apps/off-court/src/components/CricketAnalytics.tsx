interface CricketScorecardData {
  total_runs: number;
  balls_faced: number;
  strike_rate: number;
  fours: number;
  sixes: number;
  wickets: number;
  overs: string;
}

interface WagonWheelPoint {
  angle: number;
  distance: number;
  runs: number;
}

interface PitchMapPoint {
  x: number;
  y: number;
  type: string;
}

interface CricketAnalyticsProps {
  sport: string;
  date: string;
  scorecard: CricketScorecardData;
  wagonWheel: WagonWheelPoint[];
  pitchMap: PitchMapPoint[];
  zoneScores: Record<string, number>;
}

const GREEN = '#2D6A4F';
const GREEN_LIGHT = '#40916C';
const BG = '#111118';
const CARD = '#18181F';
const CARD2 = '#1C1C26';
const GRAY = '#6B7280';
const GRAY_LIGHT = '#9CA3AF';

const ZONE_NAMES = [
  'fine-leg', 'square-leg', 'mid-wicket', 'long-on',
  'long-off', 'cover', 'point', 'third-man',
] as const;

const DELIVERY_COLORS: Record<string, string> = {
  'good-length': GREEN,
  short: '#EF4444',
  full: '#F59E0B',
  yorker: '#3B82F6',
};

function shotLineColor(runs: number): string {
  if (runs === 6) return '#D4AF37';
  if (runs === 4) return GREEN;
  if (runs >= 1) return GREEN_LIGHT;
  return GRAY;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="flex flex-col items-center rounded-xl py-4 px-3"
      style={{ backgroundColor: CARD2 }}
    >
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="mt-0.5 text-xs font-medium" style={{ color: GRAY_LIGHT }}>
        {label}
      </span>
    </div>
  );
}

function WagonWheelChart({ shots }: { shots: WagonWheelPoint[] }) {
  const cx = 120;
  const cy = 120;
  const maxR = 95;

  return (
    <svg viewBox="0 0 240 240" width="100%" style={{ display: 'block' }}>
      {/* Boundary */}
      <circle cx={cx} cy={cy} r={maxR} fill="none" stroke={CARD2} strokeWidth={1.5} />
      {/* 30-yard ring */}
      <circle
        cx={cx} cy={cy} r={maxR * 0.55}
        fill="none" stroke={CARD2} strokeWidth={0.75} strokeDasharray="4 4"
      />
      {/* Compass spokes */}
      {[0, 45, 90, 135].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={cx - maxR * Math.cos(rad)} y1={cy - maxR * Math.sin(rad)}
            x2={cx + maxR * Math.cos(rad)} y2={cy + maxR * Math.sin(rad)}
            stroke={CARD2} strokeWidth={0.5}
          />
        );
      })}
      {/* Shot lines */}
      {shots.map(({ angle, distance, runs }, i) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const x2 = cx + distance * maxR * Math.cos(rad);
        const y2 = cy + distance * maxR * Math.sin(rad);
        return (
          <line
            key={i}
            x1={cx} y1={cy} x2={x2} y2={y2}
            stroke={shotLineColor(runs)}
            strokeWidth={runs >= 4 ? 2 : 1.25}
            strokeOpacity={0.85}
          />
        );
      })}
      {/* Shot endpoint dots */}
      {shots.map(({ angle, distance, runs }, i) => {
        const rad = ((angle - 90) * Math.PI) / 180;
        const x2 = cx + distance * maxR * Math.cos(rad);
        const y2 = cy + distance * maxR * Math.sin(rad);
        return (
          <circle
            key={`dot-${i}`}
            cx={x2} cy={y2} r={runs >= 4 ? 3.5 : 2.5}
            fill={shotLineColor(runs)}
          />
        );
      })}
      {/* Batsman marker */}
      <circle cx={cx} cy={cy} r={4} fill={GRAY_LIGHT} />
      <circle cx={cx} cy={cy} r={2} fill="white" />
    </svg>
  );
}

function PitchMapChart({ deliveries }: { deliveries: PitchMapPoint[] }) {
  const W = 100;
  const H = 240;
  const padX = 12;
  const padY = 14;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {/* Pitch surface */}
      <rect x={padX} y={padY} width={innerW} height={innerH}
        fill={CARD2} rx={3} />
      {/* Bowling crease (top) */}
      <line x1={padX} y1={padY + 20} x2={padX + innerW} y2={padY + 20}
        stroke={GRAY} strokeWidth={0.75} />
      {/* Batting crease (bottom) */}
      <line x1={padX} y1={padY + innerH - 20} x2={padX + innerW} y2={padY + innerH - 20}
        stroke={GRAY} strokeWidth={0.75} />
      {/* Centre line */}
      <line x1={padX + innerW / 2} y1={padY} x2={padX + innerW / 2} y2={padY + innerH}
        stroke={CARD} strokeWidth={0.5} strokeDasharray="3 3" />
      {/* Delivery dots */}
      {deliveries.map(({ x, y, type }, i) => (
        <circle
          key={i}
          cx={padX + x * innerW}
          cy={padY + y * innerH}
          r={3.5}
          fill={DELIVERY_COLORS[type] ?? GREEN}
          fillOpacity={0.85}
        />
      ))}
    </svg>
  );
}

function ZoneBarChart({ zones }: { zones: Record<string, number> }) {
  const maxRuns = Math.max(1, ...Object.values(zones));

  return (
    <div className="flex flex-col gap-2.5">
      {ZONE_NAMES.map((zone) => {
        const runs = zones[zone] ?? 0;
        const pct = (runs / maxRuns) * 100;
        return (
          <div key={zone} className="flex items-center gap-3">
            <span
              className="w-24 text-right text-xs"
              style={{ color: GRAY_LIGHT }}
            >
              {zone.replace(/-/g, ' ')}
            </span>
            <div className="flex-1 rounded-full" style={{ backgroundColor: CARD2, height: 8 }}>
              <div
                className="rounded-full"
                style={{ width: `${pct}%`, height: 8, backgroundColor: GREEN }}
              />
            </div>
            <span className="w-6 text-right text-xs font-semibold text-white">{runs}</span>
          </div>
        );
      })}
    </div>
  );
}

export function CricketAnalytics({
  sport,
  date,
  scorecard,
  wagonWheel,
  pitchMap,
  zoneScores,
}: CricketAnalyticsProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="min-h-full px-4 py-6" style={{ backgroundColor: BG }}>
      {/* Header */}
      <div className="mb-6">
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold capitalize"
          style={{ backgroundColor: GREEN, color: '#B7E4C7' }}
        >
          {sport}
        </span>
        <h1 className="mt-2 text-2xl font-bold text-white">Cricket Analytics</h1>
        <p className="mt-0.5 text-sm" style={{ color: GRAY }}>
          {formattedDate}
        </p>
      </div>

      {/* Scorecard */}
      <div className="mb-4 rounded-xl p-5" style={{ backgroundColor: CARD }}>
        <h2 className="mb-4 text-sm font-semibold text-white">Scorecard</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Runs" value={scorecard.total_runs} />
          <StatCard label="Balls" value={scorecard.balls_faced} />
          <StatCard label="Strike Rate" value={scorecard.strike_rate} />
          <StatCard label="Fours" value={scorecard.fours} />
          <StatCard label="Sixes" value={scorecard.sixes} />
          <StatCard label="Overs" value={scorecard.overs} />
        </div>
        <div
          className="mt-4 flex items-center justify-between rounded-lg px-4 py-2.5"
          style={{ backgroundColor: CARD2 }}
        >
          <span className="text-xs font-medium" style={{ color: GRAY_LIGHT }}>
            Wickets fallen
          </span>
          <span className="text-lg font-bold text-white">{scorecard.wickets}</span>
        </div>
      </div>

      {/* Wagon Wheel */}
      <div className="mb-4 rounded-xl p-5" style={{ backgroundColor: CARD }}>
        <h2 className="mb-2 text-sm font-semibold text-white">Wagon Wheel</h2>
        <WagonWheelChart shots={wagonWheel} />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {[
            { color: '#D4AF37', label: 'Six' },
            { color: GREEN, label: 'Four' },
            { color: GREEN_LIGHT, label: '1–3 runs' },
            { color: GRAY, label: 'Dot ball' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs" style={{ color: GRAY_LIGHT }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pitch Map */}
      <div className="mb-4 rounded-xl p-5" style={{ backgroundColor: CARD }}>
        <h2 className="mb-3 text-sm font-semibold text-white">Pitch Map</h2>
        <div className="flex gap-5">
          <div style={{ width: 90, flexShrink: 0 }}>
            <PitchMapChart deliveries={pitchMap} />
          </div>
          <div className="flex flex-col justify-center gap-3">
            {[
              { color: GREEN, label: 'Good length' },
              { color: '#EF4444', label: 'Short' },
              { color: '#F59E0B', label: 'Full' },
              { color: '#3B82F6', label: 'Yorker' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-xs" style={{ color: GRAY_LIGHT }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone Distribution */}
      <div className="mb-4 rounded-xl p-5" style={{ backgroundColor: CARD }}>
        <h2 className="mb-4 text-sm font-semibold text-white">Zone Distribution</h2>
        <ZoneBarChart zones={zoneScores} />
        <p className="mt-3 text-right text-xs" style={{ color: GRAY }}>
          {Object.values(zoneScores).reduce((a, b) => a + b, 0)} total runs charted
        </p>
      </div>
    </div>
  );
}
