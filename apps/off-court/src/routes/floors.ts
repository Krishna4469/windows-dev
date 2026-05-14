import { Router, type Request, type Response } from 'express';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { floors, rooms } from '../db/schema.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;
  const result = await db
    .select()
    .from(floors)
    .where(typeof venue_id === 'string' ? eq(floors.venue_id, venue_id) : undefined)
    .orderBy(asc(floors.level_number));
  res.json(result);
});

router.get('/:id/rooms', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { type } = req.query;
  const result = await db
    .select()
    .from(rooms)
    .where(
      and(
        eq(rooms.floor_id, req.params.id),
        typeof type === 'string' ? eq(rooms.room_type, type) : undefined,
      ),
    )
    .orderBy(asc(rooms.name));
  res.json(result);
});

export default router;
