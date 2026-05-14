import { Router, type Request, type Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cvSessions, cvEvents, cvAnalytics } from '../db/schema.js';
import { generateAnalytics } from '../services/cv-analytics.js';

const router = Router();

const VALID_EVENT_TYPES = [
  'ball-out',
  'rally-start',
  'rally-end',
  'point-scored',
  'shot-detected',
  'player-position',
] as const;

// POST /sessions
interface StartSessionBody {
  venue_id: string;
  room_id: string;
  booking_id?: string;
  sport: string;
  jetson_device_id: string;
  camera_count?: number;
  started_at?: string;
}

router.post('/sessions', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, room_id, booking_id, sport, jetson_device_id, camera_count, started_at } =
    req.body as StartSessionBody;

  if (!venue_id || !room_id || !sport || !jetson_device_id) {
    res.status(400).json({ error: 'venue_id, room_id, sport, jetson_device_id are required' });
    return;
  }

  const [session] = await db
    .insert(cvSessions)
    .values({
      venue_id,
      room_id,
      booking_id: booking_id ?? null,
      sport,
      status: 'active',
      started_at: started_at ? new Date(started_at) : new Date(),
      camera_count: camera_count ?? 1,
      jetson_device_id,
    })
    .returning();

  res.status(201).json(session);
});

// PUT /sessions/:id/end
router.put('/sessions/:id/end', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const [session] = await db.select().from(cvSessions).where(eq(cvSessions.id, id));
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  if (session.status === 'ended') {
    res.status(409).json({ error: 'Session already ended' });
    return;
  }

  const [updated] = await db
    .update(cvSessions)
    .set({ status: 'ended', ended_at: new Date() })
    .where(eq(cvSessions.id, id))
    .returning();

  generateAnalytics(id).catch((err: unknown) => {
    console.error('cv analytics generation failed for session', id, err);
  });

  res.json(updated);
});

// POST /sessions/:id/events
interface CvEventInput {
  event_type: string;
  payload?: Record<string, unknown>;
  confidence?: number;
  timestamp: string;
}

router.post('/sessions/:id/events', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const body = req.body as CvEventInput | CvEventInput[];
  const inputs = Array.isArray(body) ? body : [body];

  if (inputs.length === 0) {
    res.status(400).json({ error: 'At least one event required' });
    return;
  }

  const [session] = await db.select().from(cvSessions).where(eq(cvSessions.id, id));
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  for (const input of inputs) {
    if (!input.event_type || !input.timestamp) {
      res.status(400).json({ error: 'Each event requires event_type and timestamp' });
      return;
    }
    if (!(VALID_EVENT_TYPES as readonly string[]).includes(input.event_type)) {
      res.status(400).json({
        error: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
      });
      return;
    }
  }

  const rows = await db
    .insert(cvEvents)
    .values(
      inputs.map((e) => ({
        session_id: id,
        event_type: e.event_type,
        payload: e.payload ?? {},
        confidence: e.confidence !== undefined ? String(e.confidence) : null,
        timestamp: new Date(e.timestamp),
      })),
    )
    .returning();

  res.status(201).json(rows);
});

// GET /sessions/:id/analytics
router.get('/sessions/:id/analytics', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const [session] = await db.select().from(cvSessions).where(eq(cvSessions.id, id));
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  const analytics = await db
    .select()
    .from(cvAnalytics)
    .where(eq(cvAnalytics.session_id, id))
    .orderBy(desc(cvAnalytics.created_at));

  res.json({ session, analytics });
});

// GET /members/:memberId/analytics
router.get('/members/:memberId/analytics', async (req: Request, res: Response): Promise<void> => {
  const { memberId } = req.params as { memberId: string };

  const analytics = await db
    .select()
    .from(cvAnalytics)
    .where(eq(cvAnalytics.member_id, memberId))
    .orderBy(desc(cvAnalytics.created_at));

  res.json(analytics);
});

export default router;
