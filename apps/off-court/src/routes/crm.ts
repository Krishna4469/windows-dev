import { Router, type Request, type Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { crmLeads, crmLifecycleEvents } from '../db/schema.js';

const router = Router();

const VALID_SOURCES = ['walk-in', 'referral', 'instagram', 'google', 'event', 'whatsapp'] as const;
const VALID_STATUSES = ['new', 'contacted', 'trial-booked', 'converted', 'lost'] as const;
const VALID_EVENT_TYPES = ['status-change', 'note-added', 'contacted', 'trial-completed', 'converted'] as const;
const CONTACT_EVENT_TYPES: string[] = ['contacted', 'trial-completed', 'converted'];

// GET /leads
router.get('/leads', async (req: Request, res: Response): Promise<void> => {
  const { status, source } = req.query;

  const leads = await db
    .select()
    .from(crmLeads)
    .where(
      and(
        typeof status === 'string' ? eq(crmLeads.status, status) : undefined,
        typeof source === 'string' ? eq(crmLeads.source, source) : undefined,
      ),
    )
    .orderBy(desc(crmLeads.created_at));

  res.json(leads);
});

// POST /leads
interface CreateLeadBody {
  venue_id: string;
  name: string;
  phone: string;
  email?: string;
  source: string;
  sport_interest?: string;
  assigned_to?: string;
  notes?: string;
}

router.post('/leads', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, name, phone, email, source, sport_interest, assigned_to, notes } =
    req.body as CreateLeadBody;

  if (!venue_id || !name || !phone || !source) {
    res.status(400).json({ error: 'venue_id, name, phone, source are required' });
    return;
  }

  if (!(VALID_SOURCES as readonly string[]).includes(source)) {
    res.status(400).json({ error: `source must be one of: ${VALID_SOURCES.join(', ')}` });
    return;
  }

  const [lead] = await db
    .insert(crmLeads)
    .values({
      venue_id,
      name,
      phone,
      email: email ?? null,
      source,
      sport_interest: sport_interest ?? null,
      status: 'new',
      assigned_to: assigned_to ?? null,
      notes: notes ?? null,
      last_contacted_at: null,
    })
    .returning();

  res.status(201).json(lead);
});

// PUT /leads/:id
interface UpdateLeadBody {
  status?: string;
  notes?: string;
  assigned_to?: string;
}

router.put('/leads/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { status, notes, assigned_to } = req.body as UpdateLeadBody;

  if (status !== undefined && !(VALID_STATUSES as readonly string[]).includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  if (status === undefined && notes === undefined && assigned_to === undefined) {
    res.status(400).json({ error: 'Provide at least one of: status, notes, assigned_to' });
    return;
  }

  const setClause: { status?: string; notes?: string; assigned_to?: string } = {};
  if (status !== undefined) setClause.status = status;
  if (notes !== undefined) setClause.notes = notes;
  if (assigned_to !== undefined) setClause.assigned_to = assigned_to;

  const [lead] = await db
    .update(crmLeads)
    .set(setClause)
    .where(eq(crmLeads.id, id))
    .returning();

  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  res.json(lead);
});

// POST /leads/:id/events
interface AddEventBody {
  event_type: string;
  description: string;
  created_by: string;
}

router.post('/leads/:id/events', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { event_type, description, created_by } = req.body as AddEventBody;

  if (!event_type || !description || !created_by) {
    res.status(400).json({ error: 'event_type, description, created_by are required' });
    return;
  }

  if (!(VALID_EVENT_TYPES as readonly string[]).includes(event_type)) {
    res.status(400).json({ error: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}` });
    return;
  }

  const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, id));
  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  const [event] = await db
    .insert(crmLifecycleEvents)
    .values({ lead_id: id, event_type, description, created_by })
    .returning();

  if (CONTACT_EVENT_TYPES.includes(event_type)) {
    await db
      .update(crmLeads)
      .set({ last_contacted_at: new Date() })
      .where(eq(crmLeads.id, id));
  }

  res.status(201).json(event);
});

// GET /leads/:id/timeline
router.get('/leads/:id/timeline', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const [lead] = await db.select().from(crmLeads).where(eq(crmLeads.id, id));
  if (!lead) {
    res.status(404).json({ error: 'Lead not found' });
    return;
  }

  const events = await db
    .select()
    .from(crmLifecycleEvents)
    .where(eq(crmLifecycleEvents.lead_id, id))
    .orderBy(desc(crmLifecycleEvents.created_at));

  res.json({ lead, events });
});

export default router;
