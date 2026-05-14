import { Router, type Request, type Response } from 'express';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { iotSensors, sensorReadings, facilityAlerts } from '../db/schema.js';

const router = Router();

const VALID_SENSOR_TYPES = [
  'temperature', 'humidity', 'aqi', 'co2',
  'noise', 'occupancy', 'water-leak', 'smoke',
] as const;

const VALID_ALERT_TYPES = [
  'temperature-high', 'humidity-high', 'aqi-poor', 'co2-high',
  'water-leak', 'smoke-detected', 'occupancy-full',
] as const;

const VALID_SEVERITIES = ['info', 'warning', 'critical'] as const;

type AlertType = typeof VALID_ALERT_TYPES[number];
type Severity  = typeof VALID_SEVERITIES[number];

interface ThresholdBreach {
  alertType: AlertType;
  severity: Severity;
  message: string;
}

function checkThreshold(sensorType: string, value: number, locationLabel: string): ThresholdBreach | null {
  switch (sensorType) {
    case 'temperature':
      if (value > 32) return { alertType: 'temperature-high', severity: 'critical', message: `Temperature critical at ${locationLabel}: ${value}°C` };
      if (value > 28) return { alertType: 'temperature-high', severity: 'warning',  message: `Temperature high at ${locationLabel}: ${value}°C` };
      return null;
    case 'humidity':
      if (value > 70) return { alertType: 'humidity-high', severity: 'warning', message: `Humidity high at ${locationLabel}: ${value}%` };
      return null;
    case 'aqi':
      if (value > 150) return { alertType: 'aqi-poor', severity: 'critical', message: `AQI poor at ${locationLabel}: ${value}` };
      if (value > 100) return { alertType: 'aqi-poor', severity: 'warning',  message: `AQI moderate at ${locationLabel}: ${value}` };
      return null;
    case 'co2':
      if (value > 1000) return { alertType: 'co2-high', severity: 'warning', message: `CO2 high at ${locationLabel}: ${value} ppm` };
      return null;
    case 'water-leak':
      if (value > 0) return { alertType: 'water-leak', severity: 'critical', message: `Water leak detected at ${locationLabel}` };
      return null;
    case 'smoke':
      if (value > 0) return { alertType: 'smoke-detected', severity: 'critical', message: `Smoke detected at ${locationLabel}` };
      return null;
    default:
      return null;
  }
}

// GET /api/facility/sensors?venue_id=
router.get('/sensors', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;

  const sensors = await db
    .select()
    .from(iotSensors)
    .where(
      and(
        typeof venue_id === 'string' ? eq(iotSensors.venue_id, venue_id) : undefined,
        eq(iotSensors.status, 'active'),
      ),
    )
    .orderBy(iotSensors.sensor_type, iotSensors.location_label);

  if (sensors.length === 0) {
    res.json([]);
    return;
  }

  const sensorIds = sensors.map((s) => s.id);
  const allReadings = await db
    .select()
    .from(sensorReadings)
    .where(inArray(sensorReadings.sensor_id, sensorIds))
    .orderBy(desc(sensorReadings.recorded_at));

  const latestMap = new Map<string, typeof sensorReadings.$inferSelect>();
  for (const r of allReadings) {
    if (!latestMap.has(r.sensor_id)) latestMap.set(r.sensor_id, r);
  }

  res.json(sensors.map((s) => ({ ...s, latestReading: latestMap.get(s.id) ?? null })));
});

// POST /api/facility/sensors
router.post('/sensors', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, room_id, sensor_type, location_label, device_id } = req.body as {
    venue_id?: unknown;
    room_id?: unknown;
    sensor_type?: unknown;
    location_label?: unknown;
    device_id?: unknown;
  };

  if (
    typeof venue_id       !== 'string' ||
    typeof sensor_type    !== 'string' ||
    typeof location_label !== 'string' ||
    typeof device_id      !== 'string'
  ) {
    res.status(400).json({ error: 'venue_id, sensor_type, location_label, device_id are required' });
    return;
  }

  if (!(VALID_SENSOR_TYPES as readonly string[]).includes(sensor_type)) {
    res.status(400).json({ error: `sensor_type must be one of: ${VALID_SENSOR_TYPES.join(', ')}` });
    return;
  }

  const [row] = await db
    .insert(iotSensors)
    .values({
      venue_id,
      room_id:        typeof room_id === 'string' ? room_id : null,
      sensor_type,
      location_label,
      device_id,
    })
    .returning();

  res.status(201).json(row);
});

// POST /api/facility/readings
router.post('/readings', async (req: Request, res: Response): Promise<void> => {
  const { sensor_id, value, unit, recorded_at } = req.body as {
    sensor_id?: unknown;
    value?: unknown;
    unit?: unknown;
    recorded_at?: unknown;
  };

  if (
    typeof sensor_id !== 'string' ||
    typeof unit      !== 'string' ||
    (typeof value !== 'number' && typeof value !== 'string')
  ) {
    res.status(400).json({ error: 'sensor_id, value, unit are required' });
    return;
  }

  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(numericValue)) {
    res.status(400).json({ error: 'value must be numeric' });
    return;
  }

  const [sensor] = await db
    .select()
    .from(iotSensors)
    .where(eq(iotSensors.id, sensor_id));

  if (!sensor) {
    res.status(404).json({ error: 'Sensor not found' });
    return;
  }

  const breach = checkThreshold(sensor.sensor_type, numericValue, sensor.location_label);
  const ts     = typeof recorded_at === 'string' ? new Date(recorded_at) : new Date();

  const [reading] = await db
    .insert(sensorReadings)
    .values({
      sensor_id,
      value:       String(numericValue),
      unit,
      recorded_at: ts,
      is_alert:    breach !== null,
    })
    .returning();

  let alert: typeof facilityAlerts.$inferSelect | null = null;
  if (breach) {
    const [alertRow] = await db
      .insert(facilityAlerts)
      .values({
        venue_id:   sensor.venue_id,
        sensor_id:  sensor.id,
        alert_type: breach.alertType,
        severity:   breach.severity,
        message:    breach.message,
      })
      .returning();
    alert = alertRow ?? null;
  }

  res.status(201).json({ reading, alert });
});

// GET /api/facility/readings/:sensorId  (last 24 h)
router.get('/readings/:sensorId', async (req: Request<{ sensorId: string }>, res: Response): Promise<void> => {
  const { sensorId } = req.params;
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(sensorReadings)
    .where(
      and(
        eq(sensorReadings.sensor_id, sensorId),
        gte(sensorReadings.recorded_at, since),
      ),
    )
    .orderBy(sensorReadings.recorded_at);

  res.json(rows);
});

// GET /api/facility/alerts?venue_id=
router.get('/alerts', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;

  const rows = await db
    .select()
    .from(facilityAlerts)
    .where(
      and(
        typeof venue_id === 'string' ? eq(facilityAlerts.venue_id, venue_id) : undefined,
        eq(facilityAlerts.acknowledged, false),
      ),
    )
    .orderBy(desc(facilityAlerts.created_at));

  res.json(rows);
});

// PUT /api/facility/alerts/:id/acknowledge
router.put('/alerts/:id/acknowledge', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  const { acknowledged_by } = req.body as { acknowledged_by?: unknown };

  const [row] = await db
    .update(facilityAlerts)
    .set({
      acknowledged:    true,
      acknowledged_by: typeof acknowledged_by === 'string' ? acknowledged_by : null,
    })
    .where(eq(facilityAlerts.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }

  res.json(row);
});

export default router;
