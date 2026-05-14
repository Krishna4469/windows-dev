import { Router, type Request, type Response } from 'express';
import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { classes, classBookings, members } from '../db/schema.js';

const router = Router();

type ClassType = 'yoga' | 'fitness' | 'pilates' | 'hiit' | 'dance' | 'kids';

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { type, date } = req.query;

  let dateStart: Date | undefined;
  let dateEnd: Date | undefined;
  if (typeof date === 'string') {
    dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
  }

  const result = await db
    .select()
    .from(classes)
    .where(
      and(
        typeof type === 'string' ? eq(classes.class_type, type) : undefined,
        dateStart !== undefined
          ? sql`${classes.scheduled_at} >= ${dateStart} AND ${classes.scheduled_at} <= ${dateEnd}`
          : undefined,
      ),
    )
    .orderBy(asc(classes.scheduled_at));
  res.json(result);
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const [cls] = await db.select().from(classes).where(eq(classes.id, req.params.id));
  if (!cls) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }
  res.json(cls);
});

interface CreateClassBody {
  venue_id: string;
  room_id?: string;
  instructor_id?: string;
  title: string;
  description?: string;
  class_type: ClassType;
  duration_minutes?: number;
  max_capacity?: number;
  scheduled_at: string;
  recurring?: boolean;
  recurrence_rule?: string;
  credits_cost?: number;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateClassBody;
  const inserted = await db
    .insert(classes)
    .values({
      venue_id: body.venue_id,
      room_id: body.room_id ?? null,
      instructor_id: body.instructor_id ?? null,
      title: body.title,
      description: body.description ?? null,
      class_type: body.class_type,
      duration_minutes: body.duration_minutes ?? 60,
      max_capacity: body.max_capacity ?? 15,
      scheduled_at: new Date(body.scheduled_at),
      recurring: body.recurring ?? false,
      recurrence_rule: body.recurrence_rule ?? null,
      credits_cost: String(body.credits_cost ?? 10),
    })
    .returning();
  const cls = inserted[0];
  if (!cls) {
    res.status(500).json({ error: 'Insert failed' });
    return;
  }
  res.status(201).json(cls);
});

router.post('/:id/book', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { member_id } = req.body as { member_id: string };
  if (!member_id) {
    res.status(400).json({ error: 'member_id required' });
    return;
  }

  const [cls] = await db.select().from(classes).where(eq(classes.id, req.params.id));
  if (!cls) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }

  if (cls.current_bookings >= cls.max_capacity) {
    res.status(400).json({ error: 'Class is full' });
    return;
  }

  const [existing] = await db
    .select()
    .from(classBookings)
    .where(and(eq(classBookings.class_id, req.params.id), eq(classBookings.member_id, member_id)));
  if (existing) {
    res.json(existing);
    return;
  }

  const [member] = await db.select().from(members).where(eq(members.id, member_id));
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const creditBalance = Number(member.credit_balance);
  const creditsCost = Number(cls.credits_cost);
  if (creditBalance < creditsCost) {
    res.status(400).json({ error: 'Insufficient credits', balance: creditBalance, required: creditsCost });
    return;
  }

  await db
    .update(members)
    .set({ credit_balance: String(creditBalance - creditsCost) })
    .where(eq(members.id, member_id));

  const [booking] = await db
    .insert(classBookings)
    .values({ class_id: req.params.id, member_id, status: 'confirmed' })
    .returning();

  await db
    .update(classes)
    .set({ current_bookings: sql`${classes.current_bookings} + 1` })
    .where(eq(classes.id, req.params.id));

  res.status(201).json(booking);
});

router.delete('/:id/book', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { member_id } = req.body as { member_id: string };
  if (!member_id) {
    res.status(400).json({ error: 'member_id required' });
    return;
  }

  const [existing] = await db
    .select()
    .from(classBookings)
    .where(and(eq(classBookings.class_id, req.params.id), eq(classBookings.member_id, member_id)));
  if (!existing) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  await db
    .delete(classBookings)
    .where(and(eq(classBookings.class_id, req.params.id), eq(classBookings.member_id, member_id)));

  const [cls] = await db.select().from(classes).where(eq(classes.id, req.params.id));
  if (cls) {
    const creditsCost = Number(cls.credits_cost);
    const [member] = await db.select().from(members).where(eq(members.id, member_id));
    if (member) {
      await db
        .update(members)
        .set({ credit_balance: String(Number(member.credit_balance) + creditsCost) })
        .where(eq(members.id, member_id));
    }
    await db
      .update(classes)
      .set({ current_bookings: sql`${classes.current_bookings} - 1` })
      .where(eq(classes.id, req.params.id));
  }

  res.status(204).send();
});

export default router;
