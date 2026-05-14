import { Router, type Request, type Response } from 'express';
import { and, eq, desc } from 'drizzle-orm';
import { db } from '../db/client.js';
import { leaderboardEntries } from '../db/schema.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { sport } = req.query;

  const entries = await db
    .select()
    .from(leaderboardEntries)
    .where(
      and(
        eq(leaderboardEntries.opt_in, true),
        typeof sport === 'string' ? eq(leaderboardEntries.sport, sport) : undefined,
      ),
    )
    .orderBy(desc(leaderboardEntries.win_rate), desc(leaderboardEntries.total_games));

  res.json(entries);
});

interface OptInBody {
  venue_id: string;
  member_id: string;
  member_name: string;
  sport: string;
  total_games?: number;
  total_wins?: number;
  last_played?: string;
}

router.post('/optin', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as OptInBody;

  if (!body.venue_id || !body.member_id || !body.member_name || !body.sport) {
    res.status(400).json({ error: 'venue_id, member_id, member_name, and sport are required' });
    return;
  }

  const total_games = body.total_games ?? 0;
  const total_wins = body.total_wins ?? 0;
  const win_rate = total_games > 0 ? (total_wins / total_games).toFixed(4) : '0';

  const inserted = await db
    .insert(leaderboardEntries)
    .values({
      venue_id: body.venue_id,
      member_id: body.member_id,
      member_name: body.member_name,
      sport: body.sport,
      total_games,
      total_wins,
      win_rate,
      last_played: body.last_played ? new Date(body.last_played) : null,
      opt_in: true,
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: [leaderboardEntries.venue_id, leaderboardEntries.member_id, leaderboardEntries.sport],
      set: {
        member_name: body.member_name,
        total_games,
        total_wins,
        win_rate,
        last_played: body.last_played ? new Date(body.last_played) : null,
        opt_in: true,
        updated_at: new Date(),
      },
    })
    .returning();

  const entry = inserted[0];
  if (!entry) {
    res.status(500).json({ error: 'Upsert failed' });
    return;
  }
  res.status(201).json(entry);
});

interface OptOutBody {
  venue_id: string;
  member_id: string;
  sport: string;
}

router.post('/optout', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, member_id, sport } = req.body as OptOutBody;

  if (!venue_id || !member_id || !sport) {
    res.status(400).json({ error: 'venue_id, member_id, and sport are required' });
    return;
  }

  await db
    .update(leaderboardEntries)
    .set({ opt_in: false, updated_at: new Date() })
    .where(
      and(
        eq(leaderboardEntries.venue_id, venue_id),
        eq(leaderboardEntries.member_id, member_id),
        eq(leaderboardEntries.sport, sport),
      ),
    );

  res.status(204).send();
});

export default router;
