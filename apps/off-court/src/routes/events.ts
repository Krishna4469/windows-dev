import { Router, type Request, type Response } from 'express';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { events, eventRsvps, members } from '../db/schema.js';
import { sendTemplateMessage } from '../services/whatsapp-send.js';

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

router.post('/:id/rsvp', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { member_id } = req.body as { member_id: string };
  if (!member_id) { res.status(400).json({ error: 'member_id required' }); return; }

  const [event] = await db.select().from(events).where(eq(events.id, req.params.id));
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }

  const [existing] = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.event_id, req.params.id), eq(eventRsvps.member_id, member_id)));
  if (existing) { res.json(existing); return; }

  const isFull = event.current_rsvp >= event.max_capacity;

  if (!isFull) {
    const [rsvp] = await db
      .insert(eventRsvps)
      .values({ event_id: req.params.id, member_id, status: 'confirmed' })
      .returning();
    await db
      .update(events)
      .set({ current_rsvp: sql`${events.current_rsvp} + 1` })
      .where(eq(events.id, req.params.id));
    res.status(201).json(rsvp);
    return;
  }

  const [row] = await db
    .select({ maxPos: sql<number>`coalesce(max(${eventRsvps.waitlist_position}), 0)` })
    .from(eventRsvps)
    .where(and(eq(eventRsvps.event_id, req.params.id), eq(eventRsvps.status, 'waitlist')));
  const nextPos = (row?.maxPos ?? 0) + 1;

  const [rsvp] = await db
    .insert(eventRsvps)
    .values({ event_id: req.params.id, member_id, status: 'waitlist', waitlist_position: nextPos })
    .returning();
  res.status(201).json(rsvp);
});

router.delete('/:id/rsvp', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { member_id } = req.body as { member_id: string };
  if (!member_id) { res.status(400).json({ error: 'member_id required' }); return; }

  const [existing] = await db
    .select()
    .from(eventRsvps)
    .where(and(eq(eventRsvps.event_id, req.params.id), eq(eventRsvps.member_id, member_id)));
  if (!existing) { res.status(404).json({ error: 'RSVP not found' }); return; }

  await db
    .delete(eventRsvps)
    .where(and(eq(eventRsvps.event_id, req.params.id), eq(eventRsvps.member_id, member_id)));

  if (existing.status === 'confirmed') {
    const [firstWaitlist] = await db
      .select()
      .from(eventRsvps)
      .where(and(eq(eventRsvps.event_id, req.params.id), eq(eventRsvps.status, 'waitlist')))
      .orderBy(asc(eventRsvps.waitlist_position))
      .limit(1);

    if (firstWaitlist) {
      await db
        .update(eventRsvps)
        .set({ status: 'confirmed', waitlist_position: null })
        .where(eq(eventRsvps.id, firstWaitlist.id));

      const [promotedMember] = await db
        .select({ phone: members.phone })
        .from(members)
        .where(eq(members.id, firstWaitlist.member_id));

      if (promotedMember) {
        const [event] = await db.select({ title: events.title }).from(events).where(eq(events.id, req.params.id));
        sendTemplateMessage(promotedMember.phone, 'event_invitation', 'en', [
          { type: 'body', parameters: [{ type: 'text', text: event?.title ?? '' }] },
        ]).catch(() => undefined);
      }
    } else {
      await db
        .update(events)
        .set({ current_rsvp: sql`${events.current_rsvp} - 1` })
        .where(eq(events.id, req.params.id));
    }
  }

  res.status(204).send();
});

router.get('/:id/rsvps', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const result = await db
    .select()
    .from(eventRsvps)
    .where(eq(eventRsvps.event_id, req.params.id))
    .orderBy(asc(eventRsvps.status), asc(eventRsvps.waitlist_position));
  res.json(result);
});

export default router;
