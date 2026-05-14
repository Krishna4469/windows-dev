import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { crews, crewMembers } from '../db/schema.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const venueId = req.query['venue_id'];
  const result =
    typeof venueId === 'string'
      ? await db.select().from(crews).where(eq(crews.venue_id, venueId))
      : await db.select().from(crews);
  res.json(result);
});

interface CreateCrewBody {
  name: string;
  description?: string;
  sport: string;
  venue_id: string;
  created_by: string;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateCrewBody;
  const inserted = await db
    .insert(crews)
    .values({
      name: body.name,
      description: body.description ?? null,
      sport: body.sport,
      venue_id: body.venue_id,
      created_by: body.created_by,
    })
    .returning();
  const crew = inserted[0];
  if (!crew) {
    res.status(500).json({ error: 'Insert failed' });
    return;
  }
  res.status(201).json(crew);
});

router.post('/:id/join', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id: crewId } = req.params;
  const { member_id } = req.body as { member_id: string };
  const inserted = await db
    .insert(crewMembers)
    .values({ crew_id: crewId, member_id })
    .returning();
  const member = inserted[0];
  if (!member) {
    res.status(500).json({ error: 'Insert failed' });
    return;
  }
  res.status(201).json(member);
});

router.get('/:id/members', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id: crewId } = req.params;
  const members = await db
    .select()
    .from(crewMembers)
    .where(eq(crewMembers.crew_id, crewId));
  res.json(members);
});

export default router;
