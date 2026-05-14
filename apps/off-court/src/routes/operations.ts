import { Router, type Request, type Response } from 'express';
import { and, desc, eq, gte, lte, ne } from 'drizzle-orm';
import { db } from '../db/client.js';
import { housekeepingTasks, valetRequests, kitchenOrders } from '../db/schema.js';

const router = Router();

const VALID_TASK_TYPES    = ['cleaning', 'sanitising', 'restocking', 'inspection'] as const;
const VALID_TASK_STATUSES = ['pending', 'in-progress', 'completed', 'skipped']    as const;
const VALID_VALET_STATUSES = ['requested', 'parked', 'ready', 'collected']        as const;
const VALID_ORDER_TYPES   = ['dine-in', 'takeaway', 'pre-order']                  as const;
const VALID_ORDER_STATUSES = ['pending', 'preparing', 'ready', 'delivered']       as const;

// ---- HOUSEKEEPING ----

// GET /api/ops/housekeeping?venue_id=&status=&date=YYYY-MM-DD
router.get('/housekeeping', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, status, date } = req.query;

  let dateStart: Date | undefined;
  let dateEnd:   Date | undefined;
  if (typeof date === 'string') {
    dateStart = new Date(`${date}T00:00:00`);
    dateEnd   = new Date(`${date}T23:59:59`);
  }

  const rows = await db
    .select()
    .from(housekeepingTasks)
    .where(
      and(
        typeof venue_id === 'string'
          ? eq(housekeepingTasks.venue_id, venue_id)
          : undefined,
        typeof status === 'string' && (VALID_TASK_STATUSES as readonly string[]).includes(status)
          ? eq(housekeepingTasks.status, status)
          : undefined,
        dateStart !== undefined ? gte(housekeepingTasks.scheduled_at, dateStart) : undefined,
        dateEnd   !== undefined ? lte(housekeepingTasks.scheduled_at, dateEnd)   : undefined,
      ),
    )
    .orderBy(housekeepingTasks.scheduled_at);

  res.json(rows);
});

// POST /api/ops/housekeeping
router.post('/housekeeping', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, room_id, task_type, scheduled_at, notes, assigned_to } = req.body as {
    venue_id?: unknown;
    room_id?: unknown;
    task_type?: unknown;
    scheduled_at?: unknown;
    notes?: unknown;
    assigned_to?: unknown;
  };

  if (typeof venue_id !== 'string' || typeof task_type !== 'string' || typeof scheduled_at !== 'string') {
    res.status(400).json({ error: 'venue_id, task_type, scheduled_at are required' });
    return;
  }

  if (!(VALID_TASK_TYPES as readonly string[]).includes(task_type)) {
    res.status(400).json({ error: `task_type must be one of: ${VALID_TASK_TYPES.join(', ')}` });
    return;
  }

  const [row] = await db
    .insert(housekeepingTasks)
    .values({
      venue_id,
      room_id:      typeof room_id     === 'string' ? room_id     : null,
      task_type,
      scheduled_at: new Date(scheduled_at),
      notes:        typeof notes       === 'string' ? notes       : null,
      assigned_to:  typeof assigned_to === 'string' ? assigned_to : null,
    })
    .returning();

  res.status(201).json(row);
});

// PUT /api/ops/housekeeping/:id
router.put('/housekeeping/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, assigned_to, completed_at, notes } = req.body as {
    status?: unknown;
    assigned_to?: unknown;
    completed_at?: unknown;
    notes?: unknown;
  };

  if (
    typeof status === 'string' &&
    !(VALID_TASK_STATUSES as readonly string[]).includes(status)
  ) {
    res.status(400).json({ error: `status must be one of: ${VALID_TASK_STATUSES.join(', ')}` });
    return;
  }

  const updates: Partial<{
    status: string;
    assigned_to: string | null;
    completed_at: Date | null;
    notes: string | null;
  }> = {};

  if (typeof status      === 'string') updates.status      = status;
  if (typeof assigned_to === 'string') updates.assigned_to = assigned_to;
  if (typeof completed_at === 'string') updates.completed_at = new Date(completed_at);
  if (status === 'completed' && updates.completed_at === undefined) updates.completed_at = new Date();
  if (typeof notes === 'string') updates.notes = notes;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  const [row] = await db
    .update(housekeepingTasks)
    .set(updates)
    .where(eq(housekeepingTasks.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: 'Task not found' }); return; }
  res.json(row);
});

// ---- VALET ----

// GET /api/ops/valet?venue_id=
router.get('/valet', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;

  const rows = await db
    .select()
    .from(valetRequests)
    .where(
      and(
        typeof venue_id === 'string' ? eq(valetRequests.venue_id, venue_id) : undefined,
        ne(valetRequests.status, 'collected'),
      ),
    )
    .orderBy(desc(valetRequests.requested_at));

  res.json(rows);
});

// POST /api/ops/valet
router.post('/valet', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, member_id, vehicle_number } = req.body as {
    venue_id?: unknown;
    member_id?: unknown;
    vehicle_number?: unknown;
  };

  if (typeof venue_id !== 'string' || typeof member_id !== 'string' || typeof vehicle_number !== 'string') {
    res.status(400).json({ error: 'venue_id, member_id, vehicle_number are required' });
    return;
  }

  const [row] = await db
    .insert(valetRequests)
    .values({ venue_id, member_id, vehicle_number })
    .returning();

  res.status(201).json(row);
});

// PUT /api/ops/valet/:id
router.put('/valet/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, parking_slot, collected_at } = req.body as {
    status?: unknown;
    parking_slot?: unknown;
    collected_at?: unknown;
  };

  if (
    typeof status === 'string' &&
    !(VALID_VALET_STATUSES as readonly string[]).includes(status)
  ) {
    res.status(400).json({ error: `status must be one of: ${VALID_VALET_STATUSES.join(', ')}` });
    return;
  }

  const updates: Partial<{
    status: string;
    parking_slot: string | null;
    collected_at: Date | null;
  }> = {};

  if (typeof status       === 'string') updates.status       = status;
  if (typeof parking_slot === 'string') updates.parking_slot = parking_slot;
  if (typeof collected_at === 'string') updates.collected_at = new Date(collected_at);
  if (status === 'collected' && updates.collected_at === undefined) updates.collected_at = new Date();

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  const [row] = await db
    .update(valetRequests)
    .set(updates)
    .where(eq(valetRequests.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: 'Valet request not found' }); return; }
  res.json(row);
});

// ---- KITCHEN ----

// GET /api/ops/kitchen?venue_id=
router.get('/kitchen', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;

  const rows = await db
    .select()
    .from(kitchenOrders)
    .where(
      and(
        typeof venue_id === 'string' ? eq(kitchenOrders.venue_id, venue_id) : undefined,
        ne(kitchenOrders.status, 'delivered'),
      ),
    )
    .orderBy(kitchenOrders.created_at);

  res.json(rows);
});

// POST /api/ops/kitchen
router.post('/kitchen', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, order_type, items, table_number, member_id, total_credits } = req.body as {
    venue_id?: unknown;
    order_type?: unknown;
    items?: unknown;
    table_number?: unknown;
    member_id?: unknown;
    total_credits?: unknown;
  };

  if (
    typeof venue_id      !== 'string' ||
    typeof order_type    !== 'string' ||
    items === undefined  ||
    (typeof total_credits !== 'number' && typeof total_credits !== 'string')
  ) {
    res.status(400).json({ error: 'venue_id, order_type, items, total_credits are required' });
    return;
  }

  if (!(VALID_ORDER_TYPES as readonly string[]).includes(order_type)) {
    res.status(400).json({ error: `order_type must be one of: ${VALID_ORDER_TYPES.join(', ')}` });
    return;
  }

  const [row] = await db
    .insert(kitchenOrders)
    .values({
      venue_id,
      order_type,
      items,
      table_number:  typeof table_number === 'string' ? table_number : null,
      member_id:     typeof member_id    === 'string' ? member_id    : null,
      total_credits: String(total_credits),
    })
    .returning();

  res.status(201).json(row);
});

// PUT /api/ops/kitchen/:id
router.put('/kitchen/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  const { status, ready_at } = req.body as {
    status?: unknown;
    ready_at?: unknown;
  };

  if (
    typeof status === 'string' &&
    !(VALID_ORDER_STATUSES as readonly string[]).includes(status)
  ) {
    res.status(400).json({ error: `status must be one of: ${VALID_ORDER_STATUSES.join(', ')}` });
    return;
  }

  const updates: Partial<{
    status: string;
    ready_at: Date | null;
  }> = {};

  if (typeof status   === 'string') updates.status   = status;
  if (typeof ready_at === 'string') updates.ready_at = new Date(ready_at);
  if (status === 'ready' && updates.ready_at === undefined) updates.ready_at = new Date();

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  const [row] = await db
    .update(kitchenOrders)
    .set(updates)
    .where(eq(kitchenOrders.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: 'Order not found' }); return; }
  res.json(row);
});

export default router;
