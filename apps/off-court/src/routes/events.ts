import { Router, type Request, type Response } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { events } from '../db/schema.js';

const router = Router();

type EventType = 'tournament' | 'social' | 'workshop' | 'class';

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { sport, type } = req.query;
  const result = await db
    .select()
    .from(events)
    .where(
      and(
        typeof sport === 'string' ? eq(events.sport, sport) : undefined,
        typeof type === 'string' ? eq(events.event_type, type) : undefined,
      ),
    )
    .orderBy(asc(events.scheduled_at));
  res.json(result);
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const [event] = await db.select().from(events).where(eq(events.id, req.params.id));
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.json(event);
});

interface CreateEventBody {
  venue_id: string;
  room_id?: string;
  title: string;
  description?: string;
  event_type: EventType;
  sport: string;
  scheduled_at: string;
  duration_minutes?: number;
  max_capacity: number;
  organiser_id: string;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  // Admin-only placeholder: in production, verify req.headers['x-admin-token']
  const body = req.body as CreateEventBody;
  const inserted = await db
    .insert(events)
    .values({
      venue_id: body.venue_id,
      room_id: body.room_id ?? null,
      title: body.title,
      description: body.description ?? null,
      event_type: body.event_type,
      sport: body.sport,
      scheduled_at: new Date(body.scheduled_at),
      duration_minutes: body.duration_minutes ?? 60,
      max_capacity: body.max_capacity,
      organiser_id: body.organiser_id,
    })
    .returning();
  const event = inserted[0];
  if (!event) {
    res.status(500).json({ error: 'Insert failed' });
    return;
  }
  res.status(201).json(event);
});

interface UpdateEventBody {
  title?: string;
  description?: string;
  event_type?: EventType;
  sport?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  max_capacity?: number;
  current_rsvp?: number;
  status?: string;
}

router.put('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const body = req.body as UpdateEventBody;
  const patch: Partial<typeof events.$inferInsert> = {};
  if (body.title !== undefined) patch.title = body.title;
  if (body.description !== undefined) patch.description = body.description;
  if (body.event_type !== undefined) patch.event_type = body.event_type;
  if (body.sport !== undefined) patch.sport = body.sport;
  if (body.scheduled_at !== undefined) patch.scheduled_at = new Date(body.scheduled_at);
  if (body.duration_minutes !== undefined) patch.duration_minutes = body.duration_minutes;
  if (body.max_capacity !== undefined) patch.max_capacity = body.max_capacity;
  if (body.current_rsvp !== undefined) patch.current_rsvp = body.current_rsvp;
  if (body.status !== undefined) patch.status = body.status;

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: 'No fields to update' });
    return;
  }

  const updated = await db
    .update(events)
    .set(patch)
    .where(eq(events.id, req.params.id))
    .returning();
  const event = updated[0];
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.json(event);
});

router.delete('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const updated = await db
    .update(events)
    .set({ status: 'cancelled' })
    .where(eq(events.id, req.params.id))
    .returning();
  if (!updated[0]) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.status(204).send();
});

export default router;
