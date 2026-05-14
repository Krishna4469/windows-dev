import { Router, type Request, type Response } from 'express';
import { and, eq, gte, lt, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { openGames, gamePlayers } from '../db/schema.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { sport, date } = req.query;

  const dateStart =
    typeof date === 'string' ? new Date(date) : undefined;
  const dateEnd =
    typeof date === 'string'
      ? (() => {
          const e = new Date(date);
          e.setDate(e.getDate() + 1);
          return e;
        })()
      : undefined;

  const games = await db
    .select()
    .from(openGames)
    .where(
      and(
        eq(openGames.status, 'open'),
        typeof sport === 'string' ? eq(openGames.sport, sport) : undefined,
        dateStart !== undefined ? gte(openGames.scheduled_at, dateStart) : undefined,
        dateEnd !== undefined ? lt(openGames.scheduled_at, dateEnd) : undefined,
      ),
    )
    .orderBy(openGames.scheduled_at);

  const playerCountRows =
    games.length > 0
      ? await db
          .select({
            game_id: gamePlayers.game_id,
            cnt: sql<number>`count(*)::int`,
          })
          .from(gamePlayers)
          .where(inArray(gamePlayers.game_id, games.map((g) => g.id)))
          .groupBy(gamePlayers.game_id)
      : [];

  const countMap = new Map(playerCountRows.map((r) => [r.game_id, Number(r.cnt)]));
  const result = games.map((g) => ({ ...g, player_count: countMap.get(g.id) ?? 0 }));
  res.json(result);
});

interface CreateGameBody {
  venue_id: string;
  room_id?: string;
  sport: string;
  game_type?: string;
  scheduled_at: string;
  max_players?: number;
  notes?: string;
  created_by: string;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateGameBody;
  const inserted = await db
    .insert(openGames)
    .values({
      venue_id: body.venue_id,
      room_id: body.room_id ?? null,
      sport: body.sport,
      game_type: body.game_type ?? 'doubles',
      scheduled_at: new Date(body.scheduled_at),
      max_players: body.max_players ?? 4,
      notes: body.notes ?? null,
      created_by: body.created_by,
    })
    .returning();
  const game = inserted[0];
  if (!game) {
    res.status(500).json({ error: 'Insert failed' });
    return;
  }
  res.status(201).json(game);
});

router.post('/:id/join', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id: gameId } = req.params;
  const { member_id } = req.body as { member_id: string };

  const [game] = await db.select().from(openGames).where(eq(openGames.id, gameId));
  if (!game) {
    res.status(404).json({ error: 'Game not found' });
    return;
  }
  if (game.status !== 'open') {
    res.status(400).json({ error: 'Game is not open' });
    return;
  }

  const existing = await db
    .select({ id: gamePlayers.id })
    .from(gamePlayers)
    .where(eq(gamePlayers.game_id, gameId));

  if (existing.length >= game.max_players) {
    res.status(400).json({ error: 'Game is full' });
    return;
  }

  const inserted = await db
    .insert(gamePlayers)
    .values({ game_id: gameId, member_id })
    .returning();
  const player = inserted[0];
  if (!player) {
    res.status(500).json({ error: 'Insert failed' });
    return;
  }
  res.status(201).json(player);
});

router.delete('/:id/leave', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const { id: gameId } = req.params;
  const { member_id } = req.body as { member_id: string };

  await db
    .delete(gamePlayers)
    .where(and(eq(gamePlayers.game_id, gameId), eq(gamePlayers.member_id, member_id)));
  res.status(204).send();
});

export default router;
