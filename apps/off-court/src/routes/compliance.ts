import { Router, type Request, type Response } from 'express';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { complianceChecks, ppmSchedules } from '../db/schema.js';

const router = Router();

const VALID_CHECK_STATUS = ['pending', 'valid', 'expiring-soon', 'expired'] as const;
const VALID_PPM_STATUS   = ['scheduled', 'overdue', 'completed'] as const;
const VALID_CHECK_TYPES  = [
  'fire-noc', 'fssai', 'pool-licence', 'insurance',
  'electrical-cert', 'lift-cert', 'music-licence', 'gst-registration',
] as const;
const VALID_ASSET_TYPES  = [
  'court-surface', 'hvac', 'electrical', 'plumbing',
  'fire-system', 'elevator', 'pool',
] as const;

// GET /api/compliance/checks?status=
router.get('/checks', async (req: Request, res: Response): Promise<void> => {
  const { status, venue_id } = req.query;

  const rows = await db
    .select()
    .from(complianceChecks)
    .where(
      and(
        typeof venue_id === 'string' ? eq(complianceChecks.venue_id, venue_id) : undefined,
        typeof status === 'string' && (VALID_CHECK_STATUS as readonly string[]).includes(status)
          ? eq(complianceChecks.status, status)
          : undefined,
      ),
    )
    .orderBy(desc(complianceChecks.created_at));

  res.json(rows);
});

// POST /api/compliance/checks
router.post('/checks', async (req: Request, res: Response): Promise<void> => {
  const {
    venue_id, check_type, check_name, status,
    issued_date, expiry_date, issuing_authority, document_url, notes,
  } = req.body as {
    venue_id?: unknown;
    check_type?: unknown;
    check_name?: unknown;
    status?: unknown;
    issued_date?: unknown;
    expiry_date?: unknown;
    issuing_authority?: unknown;
    document_url?: unknown;
    notes?: unknown;
  };

  if (
    typeof venue_id           !== 'string' ||
    typeof check_type         !== 'string' ||
    typeof check_name         !== 'string' ||
    typeof issuing_authority  !== 'string'
  ) {
    res.status(400).json({ error: 'venue_id, check_type, check_name, issuing_authority are required' });
    return;
  }

  if (!(VALID_CHECK_TYPES as readonly string[]).includes(check_type)) {
    res.status(400).json({ error: `check_type must be one of: ${VALID_CHECK_TYPES.join(', ')}` });
    return;
  }

  const resolvedStatus =
    typeof status === 'string' && (VALID_CHECK_STATUS as readonly string[]).includes(status)
      ? status
      : 'pending';

  const [row] = await db
    .insert(complianceChecks)
    .values({
      venue_id,
      check_type,
      check_name,
      status: resolvedStatus,
      issued_date:       typeof issued_date       === 'string' ? issued_date       : null,
      expiry_date:       typeof expiry_date       === 'string' ? expiry_date       : null,
      issuing_authority,
      document_url:      typeof document_url      === 'string' ? document_url      : null,
      notes:             typeof notes             === 'string' ? notes             : '',
    })
    .returning();

  res.status(201).json(row);
});

// PUT /api/compliance/checks/:id
router.put('/checks/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, issued_date, expiry_date, document_url, notes, issuing_authority } = req.body as {
    status?: unknown;
    issued_date?: unknown;
    expiry_date?: unknown;
    document_url?: unknown;
    notes?: unknown;
    issuing_authority?: unknown;
  };

  const updates: Partial<{
    status: string;
    issued_date: string | null;
    expiry_date: string | null;
    document_url: string | null;
    notes: string;
    issuing_authority: string;
  }> = {};

  if (typeof status === 'string' && (VALID_CHECK_STATUS as readonly string[]).includes(status)) {
    updates.status = status;
  }
  if (typeof issued_date       === 'string') updates.issued_date       = issued_date;
  if (typeof expiry_date       === 'string') updates.expiry_date       = expiry_date;
  if (typeof document_url      === 'string') updates.document_url      = document_url;
  if (typeof notes             === 'string') updates.notes             = notes;
  if (typeof issuing_authority === 'string') updates.issuing_authority = issuing_authority;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  const [row] = await db
    .update(complianceChecks)
    .set(updates)
    .where(eq(complianceChecks.id, id))
    .returning();

  if (!row) {
    res.status(404).json({ error: 'Compliance check not found' });
    return;
  }

  res.json(row);
});

// GET /api/compliance/ppm?status=&venue_id=
router.get('/ppm', async (req: Request, res: Response): Promise<void> => {
  const { status, venue_id } = req.query;

  const rows = await db
    .select()
    .from(ppmSchedules)
    .where(
      and(
        typeof venue_id === 'string' ? eq(ppmSchedules.venue_id, venue_id) : undefined,
        typeof status === 'string' && (VALID_PPM_STATUS as readonly string[]).includes(status)
          ? eq(ppmSchedules.status, status)
          : undefined,
      ),
    )
    .orderBy(ppmSchedules.next_due_at);

  res.json(rows);
});

// POST /api/compliance/ppm
router.post('/ppm', async (req: Request, res: Response): Promise<void> => {
  const {
    venue_id, asset_name, asset_type, frequency_days,
    last_done_at, next_due_at, assigned_to, status,
  } = req.body as {
    venue_id?: unknown;
    asset_name?: unknown;
    asset_type?: unknown;
    frequency_days?: unknown;
    last_done_at?: unknown;
    next_due_at?: unknown;
    assigned_to?: unknown;
    status?: unknown;
  };

  if (
    typeof venue_id       !== 'string' ||
    typeof asset_name     !== 'string' ||
    typeof asset_type     !== 'string' ||
    typeof frequency_days !== 'number' ||
    typeof next_due_at    !== 'string'
  ) {
    res.status(400).json({ error: 'venue_id, asset_name, asset_type, frequency_days, next_due_at are required' });
    return;
  }

  if (!(VALID_ASSET_TYPES as readonly string[]).includes(asset_type)) {
    res.status(400).json({ error: `asset_type must be one of: ${VALID_ASSET_TYPES.join(', ')}` });
    return;
  }

  const resolvedStatus =
    typeof status === 'string' && (VALID_PPM_STATUS as readonly string[]).includes(status)
      ? status
      : 'scheduled';

  const [row] = await db
    .insert(ppmSchedules)
    .values({
      venue_id,
      asset_name,
      asset_type,
      frequency_days,
      last_done_at:  typeof last_done_at === 'string' ? last_done_at : null,
      next_due_at,
      assigned_to:   typeof assigned_to  === 'string' ? assigned_to  : null,
      status:        resolvedStatus,
    })
    .returning();

  res.status(201).json(row);
});

// PUT /api/compliance/ppm/:id/complete
router.put('/ppm/:id/complete', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;

  const [existing] = await db
    .select()
    .from(ppmSchedules)
    .where(eq(ppmSchedules.id, id));

  if (!existing) {
    res.status(404).json({ error: 'PPM schedule not found' });
    return;
  }

  const today      = new Date().toISOString().slice(0, 10);
  const nextDueMs  = new Date(today).getTime() + existing.frequency_days * 24 * 60 * 60 * 1000;
  const nextDueAt  = new Date(nextDueMs).toISOString().slice(0, 10);

  const [row] = await db
    .update(ppmSchedules)
    .set({ last_done_at: today, next_due_at: nextDueAt, status: 'completed' })
    .where(eq(ppmSchedules.id, id))
    .returning();

  res.json(row);
});

export default router;
