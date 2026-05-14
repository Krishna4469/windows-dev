import { Router, type Request, type Response } from 'express';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  crmLeads,
  crmLifecycleEvents,
  corporateAccounts,
  sponsorAccounts,
  sponsorActivations,
} from '../db/schema.js';

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

// ── Corporate ────────────────────────────────────────────────────────────────

const VALID_MEMBERSHIP_TYPES = ['bronze', 'silver', 'gold', 'platinum'] as const;
const VALID_CORP_STATUSES = ['prospect', 'active', 'inactive', 'churned'] as const;
const VALID_SPONSORSHIP_TYPES = [
  'court-naming',
  'event',
  'digital',
  'apparel',
  'food-beverage',
] as const;

// GET /corporate
router.get('/corporate', async (req: Request, res: Response): Promise<void> => {
  const { status } = req.query;

  const accounts = await db
    .select()
    .from(corporateAccounts)
    .where(typeof status === 'string' ? eq(corporateAccounts.status, status) : undefined)
    .orderBy(desc(corporateAccounts.created_at));

  res.json(accounts);
});

// POST /corporate
interface CreateCorporateBody {
  venue_id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  employee_count?: number;
  membership_type?: string;
  monthly_credits?: number;
  notes?: string;
}

router.post('/corporate', async (req: Request, res: Response): Promise<void> => {
  const {
    venue_id,
    company_name,
    contact_name,
    contact_phone,
    contact_email,
    employee_count,
    membership_type,
    monthly_credits,
    notes,
  } = req.body as CreateCorporateBody;

  if (!venue_id || !company_name || !contact_name || !contact_phone || !contact_email) {
    res
      .status(400)
      .json({ error: 'venue_id, company_name, contact_name, contact_phone, contact_email are required' });
    return;
  }

  if (
    membership_type !== undefined &&
    !(VALID_MEMBERSHIP_TYPES as readonly string[]).includes(membership_type)
  ) {
    res
      .status(400)
      .json({ error: `membership_type must be one of: ${VALID_MEMBERSHIP_TYPES.join(', ')}` });
    return;
  }

  const [account] = await db
    .insert(corporateAccounts)
    .values({
      venue_id,
      company_name,
      contact_name,
      contact_phone,
      contact_email,
      employee_count: employee_count ?? 0,
      membership_type: membership_type ?? 'bronze',
      monthly_credits: monthly_credits ?? 0,
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(account);
});

// PUT /corporate/:id
interface UpdateCorporateBody {
  status?: string;
  notes?: string;
}

router.put('/corporate/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { status, notes } = req.body as UpdateCorporateBody;

  if (
    status !== undefined &&
    !(VALID_CORP_STATUSES as readonly string[]).includes(status)
  ) {
    res
      .status(400)
      .json({ error: `status must be one of: ${VALID_CORP_STATUSES.join(', ')}` });
    return;
  }

  if (status === undefined && notes === undefined) {
    res.status(400).json({ error: 'Provide at least one of: status, notes' });
    return;
  }

  const setClause: { status?: string; notes?: string } = {};
  if (status !== undefined) setClause.status = status;
  if (notes !== undefined) setClause.notes = notes;

  const [account] = await db
    .update(corporateAccounts)
    .set(setClause)
    .where(eq(corporateAccounts.id, id))
    .returning();

  if (!account) {
    res.status(404).json({ error: 'Corporate account not found' });
    return;
  }

  res.json(account);
});

// ── Sponsors ──────────────────────────────────────────────────────────────────

// GET /sponsors
router.get('/sponsors', async (_req: Request, res: Response): Promise<void> => {
  const rows = await db
    .select({
      id: sponsorAccounts.id,
      venue_id: sponsorAccounts.venue_id,
      brand_name: sponsorAccounts.brand_name,
      contact_name: sponsorAccounts.contact_name,
      contact_email: sponsorAccounts.contact_email,
      sponsorship_type: sponsorAccounts.sponsorship_type,
      value_inr: sponsorAccounts.value_inr,
      start_date: sponsorAccounts.start_date,
      end_date: sponsorAccounts.end_date,
      deliverables: sponsorAccounts.deliverables,
      status: sponsorAccounts.status,
      created_at: sponsorAccounts.created_at,
      activations_count: count(sponsorActivations.id),
    })
    .from(sponsorAccounts)
    .leftJoin(sponsorActivations, eq(sponsorActivations.sponsor_id, sponsorAccounts.id))
    .groupBy(sponsorAccounts.id)
    .orderBy(desc(sponsorAccounts.created_at));

  res.json(rows);
});

// POST /sponsors
interface CreateSponsorBody {
  venue_id: string;
  brand_name: string;
  contact_name: string;
  contact_email: string;
  sponsorship_type: string;
  value_inr: number;
  start_date: string;
  end_date: string;
  deliverables?: unknown;
}

router.post('/sponsors', async (req: Request, res: Response): Promise<void> => {
  const {
    venue_id,
    brand_name,
    contact_name,
    contact_email,
    sponsorship_type,
    value_inr,
    start_date,
    end_date,
    deliverables,
  } = req.body as CreateSponsorBody;

  if (
    !venue_id ||
    !brand_name ||
    !contact_name ||
    !contact_email ||
    !sponsorship_type ||
    !value_inr ||
    !start_date ||
    !end_date
  ) {
    res.status(400).json({
      error:
        'venue_id, brand_name, contact_name, contact_email, sponsorship_type, value_inr, start_date, end_date are required',
    });
    return;
  }

  if (!(VALID_SPONSORSHIP_TYPES as readonly string[]).includes(sponsorship_type)) {
    res
      .status(400)
      .json({ error: `sponsorship_type must be one of: ${VALID_SPONSORSHIP_TYPES.join(', ')}` });
    return;
  }

  const [sponsor] = await db
    .insert(sponsorAccounts)
    .values({
      venue_id,
      brand_name,
      contact_name,
      contact_email,
      sponsorship_type,
      value_inr: String(value_inr),
      start_date,
      end_date,
      deliverables: deliverables ?? [],
    })
    .returning();

  res.status(201).json(sponsor);
});

// POST /sponsors/:id/activations
interface CreateActivationBody {
  activation_type: string;
  description: string;
  scheduled_at: string;
}

router.post('/sponsors/:id/activations', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { activation_type, description, scheduled_at } = req.body as CreateActivationBody;

  if (!activation_type || !description || !scheduled_at) {
    res
      .status(400)
      .json({ error: 'activation_type, description, scheduled_at are required' });
    return;
  }

  const [sponsor] = await db
    .select()
    .from(sponsorAccounts)
    .where(eq(sponsorAccounts.id, id));

  if (!sponsor) {
    res.status(404).json({ error: 'Sponsor not found' });
    return;
  }

  const [activation] = await db
    .insert(sponsorActivations)
    .values({
      sponsor_id: id,
      activation_type,
      description,
      scheduled_at: new Date(scheduled_at),
    })
    .returning();

  res.status(201).json(activation);
});

// GET /sponsors/:id/activations
router.get('/sponsors/:id/activations', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const [sponsor] = await db
    .select()
    .from(sponsorAccounts)
    .where(eq(sponsorAccounts.id, id));

  if (!sponsor) {
    res.status(404).json({ error: 'Sponsor not found' });
    return;
  }

  const activations = await db
    .select()
    .from(sponsorActivations)
    .where(eq(sponsorActivations.sponsor_id, id))
    .orderBy(desc(sponsorActivations.created_at));

  res.json(activations);
});

export default router;
