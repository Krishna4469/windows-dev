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

const SENSOR_ICONS: Record<string, string> = {
  temperature:  '🌡️',
  humidity:     '💧',
  aqi:          '🌬️',
  co2:          '☁️',
  noise:        '🔊',
  occupancy:    '👥',
  'water-leak': '🚿',
  smoke:        '🔥',
};

const ALERT_ICONS: Record<string, string> = {
  'temperature-high':  '🌡️',
  'humidity-high':     '💧',
  'aqi-poor':          '🌬️',
  'co2-high':          '☁️',
  'water-leak':        '🚿',
  'smoke-detected':    '🔥',
  'occupancy-full':    '👥',
};

interface LatestReading {
  id: string;
  sensor_id: string;
  value: string;
  unit: string;
  recorded_at: string;
  is_alert: boolean;
}

interface SensorWithReading {
  id: string;
  venue_id: string;
  room_id: string | null;
  sensor_type: string;
  location_label: string;
  device_id: string;
  status: string;
  created_at: string;
  latestReading: LatestReading | null;
}

interface FacilityAlert {
  id: string;
  venue_id: string;
  sensor_id: string | null;
  alert_type: string;
  severity: string;
  message: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  created_at: string;
}

type Tab = 'sensors' | 'alerts';

function getSensorColor(sensorType: string, value: number): string {
  switch (sensorType) {
    case 'temperature':
      if (value > 32) return RED;
      if (value > 28) return AMBER;
      return GREEN;
    case 'humidity':
      if (value > 70) return AMBER;
      return GREEN;
    case 'aqi':
      if (value > 150) return RED;
      if (value > 100) return AMBER;
      return GREEN;
    case 'co2':
      if (value > 1000) return AMBER;
      return GREEN;
    case 'water-leak':
    case 'smoke':
      if (value > 0) return RED;
      return GREEN;
    default:
      return GREEN;
  }
}

function computeHealthScore(sensors: SensorWithReading[]): number {
  const withReadings = sensors.filter((s) => s.latestReading !== null);
  if (withReadings.length === 0) return 100;

  const knownTypes = new Set(['temperature', 'humidity', 'aqi', 'co2', 'water-leak', 'smoke']);
  const scorable = withReadings.filter((s) => knownTypes.has(s.sensor_type));
  if (scorable.length === 0) return 100;

  let total = 0;
  for (const s of scorable) {
    const v = parseFloat(s.latestReading!.value);
    const c = getSensorColor(s.sensor_type, v);
    if (c === RED)   total += 0;
    else if (c === AMBER) total += 60;
    else              total += 100;
  }
  return Math.round(total / scorable.length);
}

function HealthScoreRing({ score, sensorCount }: { score: number; sensorCount: number }) {
  const color       = score >= 80 ? GREEN : score >= 50 ? AMBER : RED;
  const label       = score >= 80 ? 'Excellent' : score >= 50 ? 'Fair' : 'Critical';
  const r           = 36;
  const cx          = 44;
  const cy          = 44;
  const circ        = 2 * Math.PI * r;
  const dashLen     = (score / 100) * circ;

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
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={BORDER} strokeWidth={7} />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={7}
          strokeDasharray={`${dashLen} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
        <text x={cx} y={cy} fill={color} fontSize={20} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
          {score}
        </text>
      </svg>
      <div>
        <div style={{ fontSize: 11, color: GRAY, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>
          Health Score
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: WHITE }}>{label}</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 4 }}>
          {sensorCount} active sensor{sensorCount !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}

function AqiGauge({ value }: { value: number }) {
  const MAX_AQI   = 300;
  const cx        = 100;
  const cy        = 100;
  const r         = 78;
  const sw        = 16;
  const ratio     = Math.min(Math.max(value, 0) / MAX_AQI, 1);
  const theta     = Math.PI * (1 - ratio);

  const endX      = cx + r * Math.cos(theta);
  const endY      = cy - r * Math.sin(theta);
  const largeArc  = ratio > 0.5 ? 1 : 0;

  const needleR   = r - 8;
  const needleX   = cx + needleR * Math.cos(theta);
  const needleY   = cy - needleR * Math.sin(theta);

  const fillColor = value > 150 ? RED : value > 100 ? AMBER : GREEN;
  const aqiLabel  = value <= 50 ? 'Good' : value <= 100 ? 'Moderate' : value <= 150 ? 'Sensitive' : 'Unhealthy';

  return (
    <svg viewBox="0 0 200 115" style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* background arc */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none" stroke={BORDER} strokeWidth={sw} strokeLinecap="round"
      />

      {/* value arc */}
      {ratio > 0.005 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 0 ${endX} ${endY}`}
          fill="none" stroke={fillColor} strokeWidth={sw} strokeLinecap="round"
        />
      )}

      {/* needle */}
      <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill={WHITE} />

      {/* value */}
      <text x={cx} y={cy - 18} fill={fillColor} fontSize={28} fontWeight={800} textAnchor="middle">{value}</text>
      <text x={cx} y={cy - 4}  fill={GRAY}      fontSize={10} textAnchor="middle">AQI · {aqiLabel}</text>

      {/* range labels */}
      <text x={22}  y={cy + 14} fill={GRAY} fontSize={9} textAnchor="middle">0</text>
      <text x={178} y={cy + 14} fill={GRAY} fontSize={9} textAnchor="middle">{MAX_AQI}</text>
    </svg>
  );
}

function SensorCard({ sensor, wide }: { sensor: SensorWithReading; wide?: boolean }) {
  const raw    = sensor.latestReading ? parseFloat(sensor.latestReading.value) : null;
  const color  = raw !== null ? getSensorColor(sensor.sensor_type, raw) : GRAY;
  const unit   = sensor.latestReading?.unit ?? '';
  const icon   = SENSOR_ICONS[sensor.sensor_type] ?? '📡';

  const isBinary = sensor.sensor_type === 'water-leak' || sensor.sensor_type === 'smoke';
  const displayValue = raw === null ? '—'
    : isBinary ? (raw > 0 ? 'Detected' : 'Clear')
    : raw.toFixed(1);

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${color === RED ? RED + '66' : BORDER}`,
      borderRadius: 12,
      padding: '12px 14px',
      gridColumn: wide ? 'span 2' : undefined,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          marginTop: 2,
          boxShadow: color !== GRAY ? `0 0 6px ${color}88` : 'none',
        }} />
      </div>
      <div style={{ fontSize: isBinary ? 16 : 24, fontWeight: 800, color: raw !== null ? color : GRAY, marginTop: 8, lineHeight: 1 }}>
        {displayValue}
        {!isBinary && raw !== null && (
          <span style={{ fontSize: 11, fontWeight: 400, color: MUTED, marginLeft: 3 }}>{unit}</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {sensor.location_label}
      </div>
      <div style={{ fontSize: 9, color: GRAY, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {sensor.sensor_type.replace('-', ' ')}
      </div>
    </div>
  );
}

function AlertCard({ alert, onAcknowledge }: { alert: FacilityAlert; onAcknowledge: (id: string) => void }) {
  const color  = alert.severity === 'critical' ? RED : alert.severity === 'warning' ? AMBER : GREEN;
  const icon   = ALERT_ICONS[alert.alert_type] ?? '⚠️';
  const timeStr = new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${color}55`,
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <div style={{ color: WHITE, fontSize: 13, fontWeight: 600, flex: 1, minWidth: 0 }}>{alert.message}</div>
            <span style={{
              background: color + '22',
              color,
              border: `1px solid ${color}55`,
              borderRadius: 999,
              padding: '2px 8px',
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              whiteSpace: 'nowrap',
            }}>
              {alert.severity}
            </span>
          </div>
          <div style={{ color: GRAY, fontSize: 11 }}>{timeStr}</div>
          <button
            onClick={() => onAcknowledge(alert.id)}
            style={{
              marginTop: 8,
              background: color + '22',
              color,
              border: `1px solid ${color}55`,
              borderRadius: 8,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

export function FacilityHealth({ venueId }: { venueId: string }) {
  const [tab, setTab]         = useState<Tab>('sensors');
  const [sensors, setSensors] = useState<SensorWithReading[]>([]);
  const [alerts, setAlerts]   = useState<FacilityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [sRes, aRes] = await Promise.all([
      fetch(`/api/facility/sensors?venue_id=${venueId}`),
      fetch(`/api/facility/alerts?venue_id=${venueId}`),
    ]);
    if (sRes.ok) setSensors(await sRes.json() as SensorWithReading[]);
    if (aRes.ok) setAlerts(await aRes.json() as FacilityAlert[]);
    setLoading(false);
  }

  useEffect(() => { void loadAll(); }, [venueId]);

  async function handleAcknowledge(id: string) {
    await fetch(`/api/facility/alerts/${id}/acknowledge`, { method: 'PUT' });
    await loadAll();
  }

  const healthScore = computeHealthScore(sensors);

  const aqiSensor        = sensors.find((s) => s.sensor_type === 'aqi');
  const tempSensors      = sensors.filter((s) => s.sensor_type === 'temperature');
  const humiditySensors  = sensors.filter((s) => s.sensor_type === 'humidity');
  const otherSensors     = sensors.filter((s) => !['temperature', 'humidity', 'aqi'].includes(s.sensor_type));

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount  = alerts.filter((a) => a.severity === 'warning').length;

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
        <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>Facility Health</div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <HealthScoreRing score={healthScore} sensorCount={sensors.length} />

        {/* Alert summary strip */}
        {(criticalCount > 0 || warningCount > 0) && (
          <div style={{
            background: RED + '11',
            border: `1px solid ${RED}44`,
            borderRadius: 10,
            padding: '8px 14px',
            display: 'flex',
            gap: 16,
            marginBottom: 16,
          }}>
            {criticalCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: RED, display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: RED, fontWeight: 600 }}>{criticalCount} Critical</span>
              </div>
            )}
            {warningCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: AMBER, display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: AMBER, fontWeight: 600 }}>{warningCount} Warning</span>
              </div>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['sensors', 'alerts'] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 10,
              border: 'none',
              background: tab === t ? WHITE : CARD,
              color: tab === t ? BG : MUTED,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              letterSpacing: 0.3,
              position: 'relative',
            }}>
              {t === 'sensors' ? 'Sensors' : `Alerts${alerts.length > 0 ? ` (${alerts.length})` : ''}`}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>Loading…</div>
        )}

        {/* SENSORS TAB */}
        {!loading && tab === 'sensors' && (
          <>
            {sensors.length === 0 && (
              <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>No sensors registered.</div>
            )}

            {/* AQI gauge */}
            {aqiSensor && (
              <div style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: '14px 16px',
                marginBottom: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontSize: 11, color: GRAY, letterSpacing: 1, textTransform: 'uppercase' }}>Air Quality Index</div>
                    <div style={{ fontSize: 12, color: MUTED }}>{aqiSensor.location_label}</div>
                  </div>
                  {aqiSensor.latestReading && (() => {
                    const v     = parseFloat(aqiSensor.latestReading!.value);
                    const color = getSensorColor('aqi', v);
                    const lbl   = v <= 50 ? 'Good' : v <= 100 ? 'Moderate' : v <= 150 ? 'Sensitive' : 'Unhealthy';
                    return (
                      <span style={{
                        background: color + '22',
                        color,
                        border: `1px solid ${color}55`,
                        borderRadius: 999,
                        padding: '3px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {lbl}
                      </span>
                    );
                  })()}
                </div>
                <AqiGauge value={aqiSensor.latestReading ? parseFloat(aqiSensor.latestReading.value) : 0} />
              </div>
            )}

            {/* Temp + Humidity 2-col grid */}
            {(tempSensors.length > 0 || humiditySensors.length > 0) && (
              <>
                <div style={{ fontSize: 11, color: GRAY, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  Temperature &amp; Humidity
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {tempSensors.map((s) => <SensorCard key={s.id} sensor={s} />)}
                  {humiditySensors.map((s) => <SensorCard key={s.id} sensor={s} />)}
                </div>
              </>
            )}

            {/* Other sensors */}
            {otherSensors.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: GRAY, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
                  Other Sensors
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {otherSensors.map((s) => (
                    <SensorCard
                      key={s.id}
                      sensor={s}
                      wide={s.sensor_type === 'noise' || s.sensor_type === 'occupancy'}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ALERTS TAB */}
        {!loading && tab === 'alerts' && (
          <>
            {alerts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ color: GREEN, fontWeight: 700 }}>All clear</div>
                <div style={{ color: GRAY, fontSize: 12, marginTop: 4 }}>No active alerts</div>
              </div>
            )}
            {alerts.map((a) => (
              <AlertCard key={a.id} alert={a} onAcknowledge={handleAcknowledge} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default FacilityHealth;
