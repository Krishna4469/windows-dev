interface SpiderAxes {
  power: number;
  consistency: number;
  variety: number;
  endurance: number;
  placement: number;
  reaction: number;
}

interface ShotBreakdown {
  bandeja?: number;
  vibora?: number;
  smash?: number;
  lob?: number;
  volley?: number;
  groundstroke?: number;
  [key: string]: number | undefined;
}

interface GameAnalyticsProps {
  sport: string;
  date: string;
  totalPoints: number;
  pointsWon?: number;
  pointsLost?: number;
  totalRallies: number;
  longestRally: number;
  shotBreakdown: ShotBreakdown;
  spiderChart: SpiderAxes;
  ballSpeedKmh?: number;
  highlightsUrl?: string;
}

const SHOT_TYPES = ['groundstroke', 'volley', 'lob', 'smash', 'bandeja', 'vibora'] as const;
const SPIDER_AXES = ['power', 'consistency', 'variety', 'endurance', 'placement', 'reaction'] as const;

const MERLOT = '#6B2737';
const MERLOT_LIGHT = '#9B3A4E';
const BG = '#111118';
const CARD = '#18181F';
const CARD2 = '#1C1C26';
const GRAY = '#6B7280';
const GRAY_LIGHT = '#9CA3AF';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="flex flex-col items-center rounded-xl py-4 px-3"
      style={{ backgroundColor: CARD }}
    >
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="mt-0.5 text-xs font-medium" style={{ color: GRAY_LIGHT }}>
        {label}
      </span>
      {sub && (
        <span className="mt-0.5 text-[10px]" style={{ color: GRAY }}>
          {sub}
        </span>
      )}
    </div>
  );
}

function ShotBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 text-right text-xs capitalize" style={{ color: GRAY_LIGHT }}>
        {label}
      </span>
      <div className="flex-1 rounded-full" style={{ backgroundColor: CARD2, height: 8 }}>
        <div
          className="rounded-full"
          style={{ width: `${pct}%`, height: 8, backgroundColor: MERLOT }}
        />
      </div>
      <span className="w-6 text-right text-xs font-semibold text-white">{count}</span>
    </div>
  );
}

function SpiderChart({ axes }: { axes: SpiderAxes }) {
  const cx = 110;
  const cy = 110;
  const maxR = 75;
  const rings = [25, 50, 75, 100];

  function polarPoint(axisIndex: number, value: number): [number, number] {
    const angle = (axisIndex * Math.PI * 2) / 6 - Math.PI / 2;
    const r = (value / 100) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  }

  function hexPath(scale: number): string {
    return SPIDER_AXES.map((_, i) => {
      const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
      const r = (scale / 100) * maxR;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(' ');
  }

  const values = SPIDER_AXES.map((k) => axes[k]);
  const dataPath = values
    .map((v, i) => {
      const [x, y] = polarPoint(i, v);
      return `${x},${y}`;
    })
    .join(' ');

  const labelOffset = maxR + 18;
  const labels = SPIDER_AXES.map((k, i) => {
    const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
    return {
      key: k,
      x: cx + labelOffset * Math.cos(angle),
      y: cy + labelOffset * Math.sin(angle),
      value: axes[k],
    };
  });

  return (
    <svg viewBox="0 0 220 220" width="100%" style={{ display: 'block' }}>
      {/* Grid rings */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={hexPath(r)}
          fill="none"
          stroke={CARD2}
          strokeWidth={1}
        />
      ))}
      {/* Axis spokes */}
      {SPIDER_AXES.map((_, i) => {
        const [x, y] = polarPoint(i, 100);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke={CARD2}
            strokeWidth={1}
          />
        );
      })}
      {/* Data polygon */}
      <polygon
        points={dataPath}
        fill={MERLOT}
        fillOpacity={0.35}
        stroke={MERLOT_LIGHT}
        strokeWidth={1.5}
      />
      {/* Data points */}
      {values.map((v, i) => {
        const [x, y] = polarPoint(i, v);
        return <circle key={i} cx={x} cy={y} r={3} fill={MERLOT_LIGHT} />;
      })}
      {/* Labels */}
      {labels.map(({ key, x, y, value }) => (
        <g key={key}>
          <text
            x={x}
            y={y - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={GRAY_LIGHT}
            fontSize={8}
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight={500}
          >
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </text>
          <text
            x={x}
            y={y + 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={9}
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight={700}
          >
            {value}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function GameAnalytics({
  sport,
  date,
  totalPoints,
  pointsWon,
  pointsLost,
  totalRallies,
  longestRally,
  shotBreakdown,
  spiderChart,
  ballSpeedKmh,
  highlightsUrl,
}: GameAnalyticsProps) {
  const totalShots = SHOT_TYPES.reduce((sum, k) => sum + (shotBreakdown[k] ?? 0), 0);
  const avgRally = totalRallies > 0 ? (totalShots / totalRallies).toFixed(1) : '0';

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
          style={{ backgroundColor: MERLOT, color: '#FFB3BE' }}
        >
          {sport}
        </span>
        <h1 className="mt-2 text-2xl font-bold text-white">Game Analytics</h1>
        <p className="mt-0.5 text-sm" style={{ color: GRAY }}>
          {formattedDate}
        </p>
      </div>

      {/* Score summary */}
      {(pointsWon !== undefined || pointsLost !== undefined) && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <StatCard label="Won" value={pointsWon ?? 0} />
          <StatCard
            label="Total"
            value={totalPoints}
            sub="points"
          />
          <StatCard label="Lost" value={pointsLost ?? 0} />
        </div>
      )}

      {/* Rally stats */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatCard label="Rallies" value={totalRallies} />
        <StatCard label="Longest" value={longestRally} sub="shots" />
        <StatCard label="Avg Rally" value={avgRally} sub="shots" />
      </div>

      {/* Ball speed */}
      {ballSpeedKmh !== undefined && (
        <div
          className="mb-4 flex items-center justify-between rounded-xl px-5 py-4"
          style={{ backgroundColor: CARD }}
        >
          <div>
            <p className="text-xs font-medium" style={{ color: GRAY_LIGHT }}>
              Top Ball Speed
            </p>
            <p className="mt-0.5 text-2xl font-bold text-white">
              {ballSpeedKmh}{' '}
              <span className="text-base font-normal" style={{ color: GRAY }}>
                km/h
              </span>
            </p>
          </div>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full text-2xl"
            style={{ backgroundColor: CARD2 }}
          >
            🎾
          </div>
        </div>
      )}

      {/* Shot breakdown */}
      <div className="mb-4 rounded-xl p-5" style={{ backgroundColor: CARD }}>
        <h2 className="mb-4 text-sm font-semibold text-white">Shot Breakdown</h2>
        <div className="flex flex-col gap-3">
          {SHOT_TYPES.map((type) => (
            <ShotBar
              key={type}
              label={type}
              count={shotBreakdown[type] ?? 0}
              total={totalShots}
            />
          ))}
        </div>
        <p className="mt-3 text-right text-xs" style={{ color: GRAY }}>
          {totalShots} total shots
        </p>
      </div>

      {/* Spider chart */}
      <div className="mb-4 rounded-xl p-5" style={{ backgroundColor: CARD }}>
        <h2 className="mb-2 text-sm font-semibold text-white">Performance Profile</h2>
        <SpiderChart axes={spiderChart} />
      </div>

      {/* Highlights button */}
      {highlightsUrl && (
        <a
          href={highlightsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full rounded-xl py-4 text-center text-base font-semibold text-white"
          style={{ backgroundColor: MERLOT }}
        >
          Watch Highlights
        </a>
      )}
    </div>
  );
}
