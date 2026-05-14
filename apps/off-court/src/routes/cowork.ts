import { Router, type Request, type Response } from 'express';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { coworkBookings, kidsZoneBookings, members, rooms } from '../db/schema.js';

const CREDITS_PER_HOUR = 5;
const KIDS_CREDITS: Record<string, number> = { play: 10, class: 15, party: 30 };

// ── Co-working router ────────────────────────────────────────────────────────

export const coworkRouter = Router();

coworkRouter.get('/availability', async (req: Request, res: Response): Promise<void> => {
  const { date, venue_id } = req.query;
  if (typeof date !== 'string') {
    res.status(400).json({ error: 'date query param required (YYYY-MM-DD)' });
    return;
  }

  const [allRooms, allBookings] = await Promise.all([
    db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.room_type, 'cowork'),
          eq(rooms.status, 'active'),
          typeof venue_id === 'string' ? eq(rooms.venue_id, venue_id) : undefined,
        ),
      )
      .orderBy(asc(rooms.name)),
    db
      .select()
      .from(coworkBookings)
      .where(and(eq(coworkBookings.date, date), eq(coworkBookings.status, 'confirmed'))),
  ]);

  const result = allRooms.map((room) => ({
    ...room,
    booked_slots: allBookings
      .filter((b) => b.room_id === room.id)
      .map((b) => ({ start_time: b.start_time, end_time: b.end_time })),
  }));

  res.json(result);
});

interface BookCoworkBody {
  venue_id: string;
  room_id: string;
  member_id: string;
  date: string;
  start_time: string;
  end_time: string;
  notes?: string;
}

coworkRouter.post('/bookings', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, room_id, member_id, date, start_time, end_time, notes } =
    req.body as BookCoworkBody;

  if (!venue_id || !room_id || !member_id || !date || !start_time || !end_time) {
    res
      .status(400)
      .json({ error: 'venue_id, room_id, member_id, date, start_time, end_time are required' });
    return;
  }

  if (start_time >= end_time) {
    res.status(400).json({ error: 'start_time must be before end_time' });
    return;
  }

  const [room] = await db.select().from(rooms).where(eq(rooms.id, room_id));
  if (!room || room.room_type !== 'cowork') {
    res.status(404).json({ error: 'Cowork room not found' });
    return;
  }

  const [member] = await db.select().from(members).where(eq(members.id, member_id));
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const existing = await db
    .select()
    .from(coworkBookings)
    .where(
      and(
        eq(coworkBookings.room_id, room_id),
        eq(coworkBookings.date, date),
        eq(coworkBookings.status, 'confirmed'),
      ),
    );

  const hasConflict = existing.some((b) => start_time < b.end_time && b.start_time < end_time);
  if (hasConflict) {
    res.status(409).json({ error: 'Time slot not available' });
    return;
  }

  const startParts = start_time.split(':').map(Number);
  const endParts = end_time.split(':').map(Number);
  const startHour = startParts[0] ?? 0;
  const startMin = startParts[1] ?? 0;
  const endHour = endParts[0] ?? 0;
  const endMin = endParts[1] ?? 0;
  const durationHours = (endHour * 60 + endMin - (startHour * 60 + startMin)) / 60;

  if (durationHours <= 0) {
    res.status(400).json({ error: 'Invalid time range' });
    return;
  }

  const creditsCharged = durationHours * CREDITS_PER_HOUR;
  const balance = Number(member.credit_balance);

  if (balance < creditsCharged) {
    res.status(400).json({ error: 'Insufficient credits', balance, required: creditsCharged });
    return;
  }

  await db
    .update(members)
    .set({ credit_balance: String(balance - creditsCharged) })
    .where(eq(members.id, member_id));

  const [booking] = await db
    .insert(coworkBookings)
    .values({
      venue_id,
      room_id,
      member_id,
      date,
      start_time,
      end_time,
      duration_hours: String(durationHours),
      credits_charged: String(creditsCharged),
      status: 'confirmed',
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(booking);
});

coworkRouter.get('/bookings', async (req: Request, res: Response): Promise<void> => {
  const { member_id } = req.query;
  if (typeof member_id !== 'string') {
    res.status(400).json({ error: 'member_id query param required' });
    return;
  }

  const result = await db
    .select()
    .from(coworkBookings)
    .where(eq(coworkBookings.member_id, member_id))
    .orderBy(desc(coworkBookings.date));

  res.json(result);
});

// ── Kids zone router ─────────────────────────────────────────────────────────

export const kidsRouter = Router();

interface BookKidsBody {
  venue_id: string;
  room_id: string;
  member_id: string;
  child_name: string;
  child_age: number;
  activity_type: string;
  scheduled_at: string;
  duration_minutes?: number;
}

kidsRouter.post('/bookings', async (req: Request, res: Response): Promise<void> => {
  const {
    venue_id,
    room_id,
    member_id,
    child_name,
    child_age,
    activity_type,
    scheduled_at,
    duration_minutes,
  } = req.body as BookKidsBody;

  if (
    !venue_id ||
    !room_id ||
    !member_id ||
    !child_name ||
    child_age === undefined ||
    !activity_type ||
    !scheduled_at
  ) {
    res.status(400).json({
      error:
        'venue_id, room_id, member_id, child_name, child_age, activity_type, scheduled_at are required',
    });
    return;
  }

  if (!['play', 'class', 'party'].includes(activity_type)) {
    res.status(400).json({ error: 'activity_type must be play, class, or party' });
    return;
  }

  const [member] = await db.select().from(members).where(eq(members.id, member_id));
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const creditsCharged = KIDS_CREDITS[activity_type] ?? 10;
  const balance = Number(member.credit_balance);

  if (balance < creditsCharged) {
    res.status(400).json({ error: 'Insufficient credits', balance, required: creditsCharged });
    return;
  }

  await db
    .update(members)
    .set({ credit_balance: String(balance - creditsCharged) })
    .where(eq(members.id, member_id));

  const [booking] = await db
    .insert(kidsZoneBookings)
    .values({
      venue_id,
      room_id,
      member_id,
      child_name,
      child_age,
      activity_type,
      scheduled_at: new Date(scheduled_at),
      duration_minutes: duration_minutes ?? 60,
      credits_charged: String(creditsCharged),
      status: 'confirmed',
    })
    .returning();

  res.status(201).json(booking);
});

kidsRouter.get('/bookings', async (req: Request, res: Response): Promise<void> => {
  const { member_id } = req.query;
  if (typeof member_id !== 'string') {
    res.status(400).json({ error: 'member_id query param required' });
    return;
  }

  const result = await db
    .select()
    .from(kidsZoneBookings)
    .where(eq(kidsZoneBookings.member_id, member_id))
    .orderBy(desc(kidsZoneBookings.scheduled_at));

  res.json(result);
});
