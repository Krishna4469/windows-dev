import { Router, type Request, type Response } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { members, crewMembers, crews, gamePlayers, openGames, leaderboardEntries } from '../db/schema.js';

const router = Router();

router.get('/:id', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  const [member] = await db.select().from(members).where(eq(members.id, id));
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }
  res.json(member);
});

router.get('/:id/bookings', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  const rows = await db
    .select({
      id: gamePlayers.id,
      game_id: gamePlayers.game_id,
      joined_at: gamePlayers.joined_at,
      sport: openGames.sport,
      game_type: openGames.game_type,
      scheduled_at: openGames.scheduled_at,
      status: openGames.status,
    })
    .from(gamePlayers)
    .innerJoin(openGames, eq(gamePlayers.game_id, openGames.id))
    .where(eq(gamePlayers.member_id, id))
    .orderBy(desc(gamePlayers.joined_at))
    .limit(20);
  res.json(rows);
});

router.get('/:id/stats', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  const entries = await db
    .select()
    .from(leaderboardEntries)
    .where(eq(leaderboardEntries.member_id, id));

  const total_games = entries.reduce((s, e) => s + e.total_games, 0);
  const total_wins = entries.reduce((s, e) => s + e.total_wins, 0);
  const win_rate = total_games > 0 ? Math.round((total_wins / total_games) * 100) : 0;
  const top = [...entries].sort((a, b) => b.total_games - a.total_games)[0];

  res.json({
    total_games,
    total_wins,
    win_rate,
    favourite_sport: top?.sport ?? null,
    total_credits_spent: 0,
  });
});

router.get('/:id/crews', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  const rows = await db
    .select({
      id: crews.id,
      name: crews.name,
      sport: crews.sport,
      description: crews.description,
      role: crewMembers.role,
      joined_at: crewMembers.joined_at,
    })
    .from(crewMembers)
    .innerJoin(crews, eq(crewMembers.crew_id, crews.id))
    .where(eq(crewMembers.member_id, id));
  res.json(rows);
});

interface PreferencesBody {
  preferences?: Record<string, unknown>;
  whatsapp_opt_in?: {
    booking?: boolean;
    analytics?: boolean;
    events?: boolean;
    promotions?: boolean;
  };
}

router.put('/:id/preferences', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id } = req.params;
  const body = req.body as PreferencesBody;

  const [existing] = await db.select().from(members).where(eq(members.id, id));
  if (!existing) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const mergedOptIn = body.whatsapp_opt_in !== undefined
    ? { ...(existing.whatsapp_opt_in as Record<string, boolean>), ...body.whatsapp_opt_in }
    : existing.whatsapp_opt_in;

  const mergedPrefs = body.preferences !== undefined
    ? body.preferences
    : existing.preferences;

  await db
    .update(members)
    .set({ whatsapp_opt_in: mergedOptIn, preferences: mergedPrefs })
    .where(eq(members.id, id));

  const [updated] = await db.select().from(members).where(eq(members.id, id));
  res.json(updated);
});

export default router;
