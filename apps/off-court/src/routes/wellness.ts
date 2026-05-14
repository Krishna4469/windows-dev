import { Router, type Request, type Response } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { wellnessTreatments, wellnessBookings, wellnessCombos, members } from '../db/schema.js';

const router = Router();

router.get('/treatments', async (req: Request, res: Response): Promise<void> => {
  const { type } = req.query;
  const result = await db
    .select()
    .from(wellnessTreatments)
    .where(
      and(
        eq(wellnessTreatments.status, 'active'),
        typeof type === 'string' ? eq(wellnessTreatments.treatment_type, type) : undefined,
      ),
    )
    .orderBy(asc(wellnessTreatments.name));
  res.json(result);
});

router.get('/combos', async (_req: Request, res: Response): Promise<void> => {
  const result = await db.select().from(wellnessCombos).orderBy(asc(wellnessCombos.name));
  res.json(result);
});

interface BookTreatmentBody {
  treatment_id: string;
  member_id: string;
  scheduled_at: string;
  notes?: string;
}

router.post('/bookings', async (req: Request, res: Response): Promise<void> => {
  const { treatment_id, member_id, scheduled_at, notes } = req.body as BookTreatmentBody;

  if (!treatment_id || !member_id || !scheduled_at) {
    res.status(400).json({ error: 'treatment_id, member_id, and scheduled_at are required' });
    return;
  }

  const [treatment] = await db
    .select()
    .from(wellnessTreatments)
    .where(eq(wellnessTreatments.id, treatment_id));
  if (!treatment) {
    res.status(404).json({ error: 'Treatment not found' });
    return;
  }

  const [member] = await db.select().from(members).where(eq(members.id, member_id));
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const creditBalance = Number(member.credit_balance);
  const creditsCost = Number(treatment.credits_cost);
  if (creditBalance < creditsCost) {
    res.status(400).json({ error: 'Insufficient credits', balance: creditBalance, required: creditsCost });
    return;
  }

  await db
    .update(members)
    .set({ credit_balance: String(creditBalance - creditsCost) })
    .where(eq(members.id, member_id));

  const [booking] = await db
    .insert(wellnessBookings)
    .values({
      treatment_id,
      member_id,
      scheduled_at: new Date(scheduled_at),
      status: 'confirmed',
      credits_charged: String(creditsCost),
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(booking);
});

router.delete('/bookings/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const [booking] = await db
    .select()
    .from(wellnessBookings)
    .where(eq(wellnessBookings.id, req.params.id));
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  await db.delete(wellnessBookings).where(eq(wellnessBookings.id, req.params.id));

  const [member] = await db.select().from(members).where(eq(members.id, booking.member_id));
  if (member) {
    await db
      .update(members)
      .set({ credit_balance: String(Number(member.credit_balance) + Number(booking.credits_charged)) })
      .where(eq(members.id, booking.member_id));
  }

  res.status(204).send();
});

router.get('/bookings', async (req: Request, res: Response): Promise<void> => {
  const { member_id } = req.query;
  if (typeof member_id !== 'string') {
    res.status(400).json({ error: 'member_id query param required' });
    return;
  }

  const result = await db
    .select()
    .from(wellnessBookings)
    .where(eq(wellnessBookings.member_id, member_id))
    .orderBy(asc(wellnessBookings.scheduled_at));
  res.json(result);
});

export default router;
