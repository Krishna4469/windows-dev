import { Router, type Request, type Response } from 'express';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { staffMovementSessions, staffMovementEvents, staffAnalytics } from '../db/schema.js';
import { generateStaffAnalytics } from '../services/staff-cv.js';

const router = Router();

const VALID_EVENT_TYPES = [
  'zone-enter',
  'zone-exit',
  'idle-detected',
  'task-start',
  'task-complete',
] as const;

interface StartSessionBody {
  venue_id: string;
  staff_id: string;
  zone_id: string;
  device_id: string;
  started_at?: string;
}

router.post('/sessions', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, staff_id, zone_id, device_id, started_at } = req.body as StartSessionBody;

  if (!venue_id || !staff_id || !zone_id || !device_id) {
    res.status(400).json({ error: 'venue_id, staff_id, zone_id, device_id are required' });
    return;
  }

  const [session] = await db
    .insert(staffMovementSessions)
    .values({
      venue_id,
      staff_id,
      zone_id,
      device_id,
      started_at: started_at ? new Date(started_at) : new Date(),
    })
    .returning();

  res.status(201).json(session);
});

interface StaffEventInput {
  event_type: string;
  zone_id: string;
  payload?: Record<string, unknown>;
  timestamp: string;
}

router.post('/sessions/:id/events', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const body = req.body as StaffEventInput | StaffEventInput[];
  const inputs = Array.isArray(body) ? body : [body];

  if (inputs.length === 0) {
    res.status(400).json({ error: 'At least one event required' });
    return;
  }

  const [session] = await db.select().from(staffMovementSessions).where(eq(staffMovementSessions.id, id));
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  for (const input of inputs) {
    if (!input.event_type || !input.zone_id || !input.timestamp) {
      res.status(400).json({ error: 'Each event requires event_type, zone_id, and timestamp' });
      return;
    }
    if (!(VALID_EVENT_TYPES as readonly string[]).includes(input.event_type)) {
      res.status(400).json({ error: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}` });
      return;
    }
  }

  const rows = await db
    .insert(staffMovementEvents)
    .values(
      inputs.map((e) => ({
        session_id: id,
        event_type: e.event_type,
        zone_id: e.zone_id,
        payload: e.payload ?? {},
        timestamp: new Date(e.timestamp),
      })),
    )
    .returning();

  res.status(201).json(rows);
});

router.put('/sessions/:id/end', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const [session] = await db.select().from(staffMovementSessions).where(eq(staffMovementSessions.id, id));
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (session.ended_at) {
    res.status(409).json({ error: 'Session already ended' });
    return;
  }

  const [updated] = await db
    .update(staffMovementSessions)
    .set({ ended_at: new Date() })
    .where(eq(staffMovementSessions.id, id))
    .returning();

  const events = await db
    .select()
    .from(staffMovementEvents)
    .where(eq(staffMovementEvents.session_id, id));

  const computed = generateStaffAnalytics(id, events as unknown as Array<Record<string, unknown>>);

  const sessionDate = session.started_at.toISOString().slice(0, 10);

  const [analytics] = await db
    .insert(staffAnalytics)
    .values({
      venue_id: session.venue_id,
      staff_id: session.staff_id,
      date: sessionDate,
      zones_covered: typeof computed['zones_covered'] === 'number' ? computed['zones_covered'] : 0,
      total_distance_m: '0',
      idle_time_minutes:
        typeof computed['idle_time_minutes'] === 'number' ? computed['idle_time_minutes'] : 0,
      task_completion_rate:
        computed['task_completion_rate'] != null
          ? String(computed['task_completion_rate'])
          : null,
      peak_activity_hour:
        typeof computed['peak_activity_hour'] === 'number' ? computed['peak_activity_hour'] : null,
    })
    .returning();

  res.json({ session: updated, analytics });
});

router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, date, staffId } = req.query as {
    venue_id?: string;
    date?: string;
    staffId?: string;
  };

  if (!venue_id) {
    res.status(400).json({ error: 'venue_id query param is required' });
    return;
  }

  const conditions = [eq(staffAnalytics.venue_id, venue_id)];
  if (date) conditions.push(eq(staffAnalytics.date, date));
  if (staffId) conditions.push(eq(staffAnalytics.staff_id, staffId));

  const rows = await db
    .select()
    .from(staffAnalytics)
    .where(and(...conditions));

  res.json(rows);
});

export default router;
