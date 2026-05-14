import { useState, useEffect } from 'react';

const BG     = '#0D0D11';
const CARD   = '#18181F';
const BORDER = '#2a2a38';
const WHITE  = '#FFFFFF';
const GRAY   = '#6B7280';
const MUTED  = '#9CA3AF';
const GREEN  = '#22C55E';
const AMBER  = '#F59E0B';
const RED    = '#EF4444';

const METRIC_CONFIG = {
  'energy-kwh':          { label: 'Energy',   unit: 'kWh',    icon: '⚡', lowerIsBetter: true  },
  'water-litres':        { label: 'Water',    unit: 'L',      icon: '💧', lowerIsBetter: true  },
  'solar-generated-kwh': { label: 'Solar',    unit: 'kWh',    icon: '☀️', lowerIsBetter: false },
  'carbon-kg':           { label: 'Carbon',   unit: 'kg CO₂', icon: '🌫️', lowerIsBetter: true  },
  'waste-kg':            { label: 'Waste',    unit: 'kg',     icon: '🗑️', lowerIsBetter: true  },
  'recycled-kg':         { label: 'Recycled', unit: 'kg',     icon: '♻️', lowerIsBetter: false },
} as const;

type MetricType = keyof typeof METRIC_CONFIG;

interface SummaryItem {
  metric_type: string;
  total: number;
  target_value: number | null;
  target_period: string | null;
  pct_of_target: number | null;
}

interface SensorReading {
  value: string;
  unit: string;
}

interface Sensor {
  sensor_type: string;
  latestReading: SensorReading | null;
}

function computeScore(summary: SummaryItem[]): number {
  const scorable = summary.filter((s) => s.pct_of_target !== null);
  if (scorable.length === 0) return 0;
  let acc = 0;
  for (const item of scorable) {
    const config = METRIC_CONFIG[item.metric_type as MetricType];
    const pct = item.pct_of_target!;
    if (config?.lowerIsBetter) {
      acc += Math.max(0, Math.min(100, 100 - Math.max(0, pct - 100)));
    } else {
      acc += Math.min(100, pct);
    }
  }
  return Math.round(acc / scorable.length);
}

function certItems(summary: SummaryItem[]): Array<{ label: string; done: boolean }> {
  const get = (mt: string) => summary.find((s) => s.metric_type === mt);
  const solar    = get('solar-generated-kwh');
  const water    = get('water-litres');
  const energy   = get('energy-kwh');
  const recycled = get('recycled-kg');
  const carbon   = get('carbon-kg');
  return [
    { label: 'Solar panels installed', done: (solar?.total ?? 0) > 0 },
    { label: 'Rainwater harvesting',   done: water  !== undefined && water.pct_of_target  !== null && water.pct_of_target  <= 70 },
    { label: 'LED lighting',           done: energy !== undefined && energy.pct_of_target !== null && energy.pct_of_target <= 80 },
    { label: 'EV charging points',     done: false },
    { label: 'Waste segregation',      done: (recycled?.total ?? 0) > 0 },
    { label: 'Carbon offset program',  done: carbon !== undefined && carbon.pct_of_target !== null && carbon.pct_of_target <= 80 },
  ];
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? GREEN : score >= 50 ? AMBER : RED;
  const label = score >= 80 ? 'Excellent' : score >= 50 ? 'Fair' : 'Needs Work';
  const r     = 36;
  const circ  = 2 * Math.PI * r;
  const dash  = (score / 100) * circ;
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      padding: '16px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      marginBottom: 16,
    }}>
      <svg width={88} height={88} viewBox="0 0 88 88">
        <circle cx={44} cy={44} r={r} fill="none" stroke={BORDER} strokeWidth={7} />
        <circle
          cx={44} cy={44} r={r}
          fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
        <text x={44} y={44} fill={color} fontSize={20} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
          {score}
        </text>
      </svg>
      <div>
        <div style={{ fontSize: 11, color: GRAY, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>
          Sustainability Score
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: WHITE }}>{label}</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>Based on monthly targets</div>
      </div>
    </div>
  );
}

function MetricCard({ item }: { item: SummaryItem }) {
  const key    = item.metric_type as MetricType;
  const config = METRIC_CONFIG[key] ?? { label: item.metric_type, unit: '', icon: '📊', lowerIsBetter: true };
  const pct    = item.pct_of_target;
  const barPct = pct !== null ? Math.min(100, pct) : 0;

  let barColor = GRAY;
  let trend    = '';
  if (pct !== null) {
    if (config.lowerIsBetter) {
      barColor = pct <= 80 ? GREEN : pct <= 100 ? AMBER : RED;
      trend    = pct <= 100 ? '↓' : '↑';
    } else {
      barColor = pct >= 100 ? GREEN : pct >= 60 ? AMBER : RED;
      trend    = pct >= 100 ? '↑' : '↓';
    }
  }

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 18 }}>{config.icon}</span>
        {trend && (
          <span style={{ fontSize: 15, color: barColor, fontWeight: 800 }}>{trend}</span>
        )}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: WHITE, lineHeight: 1 }}>
        {item.total.toLocaleString(undefined, { maximumFractionDigits: 1 })}
        <span style={{ fontSize: 10, color: MUTED, fontWeight: 400, marginLeft: 3 }}>{config.unit}</span>
      </div>
      <div style={{ fontSize: 10, color: GRAY, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {config.label}
      </div>
      {item.target_value !== null && (
        <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>
          Target: {item.target_value.toLocaleString(undefined, { maximumFractionDigits: 1 })} {config.unit}
        </div>
      )}
      <div style={{ marginTop: 8, height: 4, background: BORDER, borderRadius: 99 }}>
        <div style={{
          height: '100%',
          width: `${barPct}%`,
          background: barColor,
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>
      {pct !== null && (
        <div style={{ fontSize: 9, color: barColor, marginTop: 3, fontWeight: 700 }}>
          {pct}% of target
        </div>
      )}
    </div>
  );
}

export function EnvironmentDashboard({ venueId }: { venueId: string }) {
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [aqi, setAqi]         = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [sRes, fRes] = await Promise.all([
      fetch(`/api/environment/summary?venue_id=${venueId}`),
      fetch(`/api/facility/sensors?venue_id=${venueId}`),
    ]);
    if (sRes.ok) {
      setSummary(await sRes.json() as SummaryItem[]);
    }
    if (fRes.ok) {
      const sensors = await fRes.json() as Sensor[];
      const aqiSensor = sensors.find((s) => s.sensor_type === 'aqi');
      if (aqiSensor?.latestReading) {
        setAqi(parseFloat(aqiSensor.latestReading.value));
      }
    }
    setLoading(false);
  }

  useEffect(() => { void load(); }, [venueId]);

  const score          = computeScore(summary);
  const certs          = certItems(summary);
  const completedCerts = certs.filter((c) => c.done).length;

  const solar  = summary.find((s) => s.metric_type === 'solar-generated-kwh');
  const energy = summary.find((s) => s.metric_type === 'energy-kwh');
  const carbonSaved = (solar?.total ?? 0) > 0 && (solar?.total ?? 0) > (energy?.total ?? 0);

  const aqiLabel = aqi === null ? null
    : aqi <= 50  ? 'Good'
    : aqi <= 100 ? 'Moderate'
    : aqi <= 150 ? 'Sensitive'
    : 'Unhealthy';
  const aqiColor = aqi === null ? GRAY
    : aqi > 150 ? RED
    : aqi > 100 ? AMBER
    : GREEN;

  return (
    <div style={{
      background: BG,
      minHeight: '100vh',
      color: WHITE,
      fontFamily: 'system-ui, sans-serif',
      maxWidth: 480,
      margin: '0 auto',
      padding: '0 0 80px',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 11, color: GRAY, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
          Club Standards
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>🌿 Environment</div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>Loading…</div>
        ) : (
          <>
            <ScoreRing score={score} />

            {/* Carbon saved badge */}
            {carbonSaved && (
              <div style={{
                background: GREEN + '18',
                border: `1px solid ${GREEN}44`,
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 16,
              }}>
                <span style={{ fontSize: 20 }}>🌱</span>
                <div>
                  <div style={{ color: GREEN, fontSize: 13, fontWeight: 700 }}>Solar surplus this month</div>
                  <div style={{ color: MUTED, fontSize: 11 }}>
                    {(solar?.total ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh solar vs{' '}
                    {(energy?.total ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} kWh grid usage
                  </div>
                </div>
              </div>
            )}

            {/* AQI card */}
            {aqi !== null && (
              <div style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🌬️</span>
                  <div>
                    <div style={{ fontSize: 11, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                      Air Quality Index
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: aqiColor }}>{aqi}</div>
                  </div>
                </div>
                <span style={{
                  background: aqiColor + '22',
                  color: aqiColor,
                  border: `1px solid ${aqiColor}55`,
                  borderRadius: 999,
                  padding: '4px 12px',
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {aqiLabel}
                </span>
              </div>
            )}

            {/* 6 metric cards */}
            <div style={{ fontSize: 11, color: GRAY, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              This Month
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {summary.map((item) => (
                <MetricCard key={item.metric_type} item={item} />
              ))}
            </div>

            {/* Green certification checklist */}
            <div style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 14,
              padding: '16px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>🏆 Green Certification</div>
                <span style={{
                  background: GREEN + '22',
                  color: GREEN,
                  border: `1px solid ${GREEN}44`,
                  borderRadius: 999,
                  padding: '2px 10px',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {completedCerts}/{certs.length}
                </span>
              </div>
              {certs.map(({ label, done }, i) => (
                <div key={label} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: i < certs.length - 1 ? `1px solid ${BORDER}` : 'none',
                }}>
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: done ? GREEN + '22' : 'transparent',
                    border: `1.5px solid ${done ? GREEN : GRAY}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    color: GREEN,
                    fontWeight: 800,
                    flexShrink: 0,
                  }}>
                    {done ? '✓' : ''}
                  </div>
                  <span style={{ fontSize: 13, color: done ? WHITE : MUTED }}>{label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default EnvironmentDashboard;
