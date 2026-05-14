import { Router, type Request, type Response } from 'express';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import { environmentMetrics, sustainabilityTargets } from '../db/schema.js';

const router = Router();

const VALID_METRIC_TYPES = [
  'energy-kwh',
  'water-litres',
  'solar-generated-kwh',
  'carbon-kg',
  'waste-kg',
  'recycled-kg',
] as const;

const VALID_PERIODS = ['daily', 'monthly', 'annual'] as const;

// POST /api/environment/metrics
router.post('/metrics', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, metric_type, value, recorded_date, notes } = req.body as {
    venue_id?: unknown;
    metric_type?: unknown;
    value?: unknown;
    recorded_date?: unknown;
    notes?: unknown;
  };

  if (
    typeof venue_id !== 'string' ||
    typeof metric_type !== 'string' ||
    typeof recorded_date !== 'string' ||
    (typeof value !== 'number' && typeof value !== 'string')
  ) {
    res.status(400).json({ error: 'venue_id, metric_type, value, recorded_date are required' });
    return;
  }

  if (!(VALID_METRIC_TYPES as readonly string[]).includes(metric_type)) {
    res.status(400).json({ error: `metric_type must be one of: ${VALID_METRIC_TYPES.join(', ')}` });
    return;
  }

  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  if (Number.isNaN(numericValue)) {
    res.status(400).json({ error: 'value must be numeric' });
    return;
  }

  const [row] = await db
    .insert(environmentMetrics)
    .values({
      venue_id,
      metric_type,
      value: String(numericValue),
      recorded_date,
      notes: typeof notes === 'string' ? notes : null,
    })
    .returning();

  res.status(201).json(row);
});

// GET /api/environment/metrics?venue_id=&from=&to=&metric_type=
router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, from, to, metric_type } = req.query;

  const rows = await db
    .select()
    .from(environmentMetrics)
    .where(
      and(
        typeof venue_id === 'string' ? eq(environmentMetrics.venue_id, venue_id) : undefined,
        typeof metric_type === 'string' ? eq(environmentMetrics.metric_type, metric_type) : undefined,
        typeof from === 'string' ? gte(environmentMetrics.recorded_date, from) : undefined,
        typeof to === 'string' ? lte(environmentMetrics.recorded_date, to) : undefined,
      ),
    )
    .orderBy(desc(environmentMetrics.recorded_date));

  res.json(rows);
});

// GET /api/environment/summary?venue_id=
router.get('/summary', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;

  if (typeof venue_id !== 'string') {
    res.status(400).json({ error: 'venue_id is required' });
    return;
  }

  const now       = new Date();
  const year      = now.getFullYear();
  const month     = now.getMonth() + 1;
  const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay   = new Date(year, month, 0).getDate();
  const monthEnd  = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const [metrics, targets] = await Promise.all([
    db
      .select()
      .from(environmentMetrics)
      .where(
        and(
          eq(environmentMetrics.venue_id, venue_id),
          gte(environmentMetrics.recorded_date, monthStart),
          lte(environmentMetrics.recorded_date, monthEnd),
        ),
      ),
    db
      .select()
      .from(sustainabilityTargets)
      .where(eq(sustainabilityTargets.venue_id, venue_id)),
  ]);

  const totals = new Map<string, number>();
  for (const m of metrics) {
    const v = parseFloat(m.value);
    totals.set(m.metric_type, (totals.get(m.metric_type) ?? 0) + v);
  }

  const targetMap = new Map<string, { monthly: number; period: string }>();
  for (const t of targets) {
    const v = parseFloat(t.target_value);
    const monthly =
      t.period === 'monthly' ? v :
      t.period === 'annual'  ? v / 12 :
      v * 30;
    const existing = targetMap.get(t.metric_type);
    if (!existing || t.period === 'monthly') {
      targetMap.set(t.metric_type, { monthly, period: t.period });
    }
  }

  const summary = VALID_METRIC_TYPES.map((mt) => {
    const total  = totals.get(mt) ?? 0;
    const target = targetMap.get(mt);
    const pct    = target && target.monthly > 0
      ? Math.round((total / target.monthly) * 100)
      : null;
    return {
      metric_type:   mt,
      total,
      target_value:  target?.monthly ?? null,
      target_period: target?.period ?? null,
      pct_of_target: pct,
    };
  });

  res.json(summary);
});

// GET /api/environment/targets?venue_id=
router.get('/targets', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;

  const rows = await db
    .select()
    .from(sustainabilityTargets)
    .where(
      typeof venue_id === 'string' ? eq(sustainabilityTargets.venue_id, venue_id) : undefined,
    )
    .orderBy(sustainabilityTargets.metric_type);

  res.json(rows);
});

// POST /api/environment/targets
router.post('/targets', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, metric_type, target_value, period } = req.body as {
    venue_id?: unknown;
    metric_type?: unknown;
    target_value?: unknown;
    period?: unknown;
  };

  if (
    typeof venue_id !== 'string' ||
    typeof metric_type !== 'string' ||
    typeof period !== 'string' ||
    (typeof target_value !== 'number' && typeof target_value !== 'string')
  ) {
    res.status(400).json({ error: 'venue_id, metric_type, target_value, period are required' });
    return;
  }

  if (!(VALID_METRIC_TYPES as readonly string[]).includes(metric_type)) {
    res.status(400).json({ error: `metric_type must be one of: ${VALID_METRIC_TYPES.join(', ')}` });
    return;
  }

  if (!(VALID_PERIODS as readonly string[]).includes(period)) {
    res.status(400).json({ error: `period must be one of: ${VALID_PERIODS.join(', ')}` });
    return;
  }

  const numericTarget = typeof target_value === 'number' ? target_value : parseFloat(target_value);
  if (Number.isNaN(numericTarget)) {
    res.status(400).json({ error: 'target_value must be numeric' });
    return;
  }

  const [row] = await db
    .insert(sustainabilityTargets)
    .values({
      venue_id,
      metric_type,
      target_value: String(numericTarget),
      period,
    })
    .returning();

  res.status(201).json(row);
});

export default router;
