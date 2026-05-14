import { Router, type Request, type Response } from 'express';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import { healthProfiles, healthMetrics, wellnessScores } from '../db/schema.js';
import { computeWellnessScore } from '../services/health-analytics.js';

const router = Router();

router.get('/profile', async (req: Request, res: Response): Promise<void> => {
  const { member_id } = req.query as { member_id?: string };
  if (!member_id) {
    res.status(400).json({ error: 'member_id is required' });
    return;
  }
  const rows = await db.select().from(healthProfiles).where(eq(healthProfiles.member_id, member_id));
  res.json(rows[0] ?? null);
});

interface UpdateProfileBody {
  member_id: string;
  age?: number;
  weight_kg?: number;
  height_cm?: number;
  fitness_level?: string;
  health_goals?: string[];
  medical_notes?: string;
}

router.put('/profile', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as UpdateProfileBody;
  const { member_id, age, weight_kg, height_cm, fitness_level, health_goals, medical_notes } = body;

  if (!member_id) {
    res.status(400).json({ error: 'member_id is required' });
    return;
  }

  const existing = await db.select({ id: healthProfiles.id }).from(healthProfiles)
    .where(eq(healthProfiles.member_id, member_id));

  if (existing.length === 0) {
    const [inserted] = await db.insert(healthProfiles).values({
      member_id,
      age: age ?? null,
      weight_kg: weight_kg !== undefined ? String(weight_kg) : null,
      height_cm: height_cm !== undefined ? String(height_cm) : null,
      fitness_level: fitness_level ?? 'beginner',
      health_goals: health_goals ?? [],
      medical_notes: medical_notes ?? null,
    }).returning();
    if (!inserted) { res.status(500).json({ error: 'Insert failed' }); return; }
    res.status(201).json(inserted);
    return;
  }

  const [updated] = await db.update(healthProfiles)
    .set({
      ...(age !== undefined && { age }),
      ...(weight_kg !== undefined && { weight_kg: String(weight_kg) }),
      ...(height_cm !== undefined && { height_cm: String(height_cm) }),
      ...(fitness_level !== undefined && { fitness_level }),
      ...(health_goals !== undefined && { health_goals }),
      ...(medical_notes !== undefined && { medical_notes }),
    })
    .where(eq(healthProfiles.member_id, member_id))
    .returning();
  if (!updated) { res.status(500).json({ error: 'Update failed' }); return; }
  res.json(updated);
});

interface LogMetricBody {
  member_id: string;
  metric_type: string;
  value: number;
  recorded_at?: string;
  source?: string;
}

router.post('/metrics', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as LogMetricBody;
  const { member_id, metric_type, value, recorded_at, source } = body;

  if (!member_id || !metric_type || value === undefined) {
    res.status(400).json({ error: 'member_id, metric_type, and value are required' });
    return;
  }

  const [inserted] = await db.insert(healthMetrics).values({
    member_id,
    metric_type,
    value: String(value),
    recorded_at: recorded_at ? new Date(recorded_at) : new Date(),
    source: source ?? 'manual',
  }).returning();
  if (!inserted) { res.status(500).json({ error: 'Insert failed' }); return; }
  res.status(201).json(inserted);
});

router.get('/metrics', async (req: Request, res: Response): Promise<void> => {
  const { member_id, type, from, to } = req.query as {
    member_id?: string;
    type?: string;
    from?: string;
    to?: string;
  };

  if (!member_id) {
    res.status(400).json({ error: 'member_id is required' });
    return;
  }

  const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  const rows = await db.select().from(healthMetrics)
    .where(and(
      eq(healthMetrics.member_id, member_id),
      gte(healthMetrics.recorded_at, fromDate),
      lte(healthMetrics.recorded_at, toDate),
      typeof type === 'string' ? eq(healthMetrics.metric_type, type) : undefined,
    ))
    .orderBy(desc(healthMetrics.recorded_at));

  res.json(rows);
});

router.get('/score', async (req: Request, res: Response): Promise<void> => {
  const { member_id } = req.query as { member_id?: string };
  if (!member_id) {
    res.status(400).json({ error: 'member_id is required' });
    return;
  }

  const score = await computeWellnessScore(member_id);

  await db.insert(wellnessScores).values({
    member_id,
    score_date: new Date().toISOString().slice(0, 10),
    activity_score: score.activity,
    recovery_score: score.recovery,
    consistency_score: score.consistency,
    overall_score: score.overall,
    insights: score.insights,
  });

  res.json(score);
});

router.get('/trends', async (req: Request, res: Response): Promise<void> => {
  const { member_id } = req.query as { member_id?: string };
  if (!member_id) {
    res.status(400).json({ error: 'member_id is required' });
    return;
  }

  const since = new Date();
  since.setDate(since.getDate() - 56);

  const rows = await db.select().from(healthMetrics)
    .where(and(eq(healthMetrics.member_id, member_id), gte(healthMetrics.recorded_at, since)));

  const weeklyAgg = new Map<string, Map<string, number[]>>();

  for (const row of rows) {
    const dt = new Date(row.recorded_at);
    const weekStart = new Date(dt);
    weekStart.setDate(dt.getDate() - dt.getDay());
    const weekKey = weekStart.toISOString().slice(0, 10);

    if (!weeklyAgg.has(weekKey)) weeklyAgg.set(weekKey, new Map());
    const typeMap = weeklyAgg.get(weekKey)!;
    if (!typeMap.has(row.metric_type)) typeMap.set(row.metric_type, []);
    typeMap.get(row.metric_type)!.push(parseFloat(row.value));
  }

  const trends: Array<{ week: string; type: string; avg: number; count: number }> = [];
  for (const [week, typeMap] of weeklyAgg) {
    for (const [type, values] of typeMap) {
      const sum = values.reduce((s, v) => s + v, 0);
      const avg = values.length > 0 ? sum / values.length : 0;
      trends.push({ week, type, avg: Math.round(avg * 10) / 10, count: values.length });
    }
  }

  trends.sort((a, b) => a.week.localeCompare(b.week));
  res.json(trends);
});

export default router;
