import { Router, type Request, type Response } from 'express';
import { and, asc, eq, inArray, not, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tournaments, tournamentMatches, eventRsvps, members } from '../db/schema.js';

const router = Router();

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { event_id, format, sport } = req.body as { event_id: string; format?: string; sport: string };
  if (!event_id || !sport) {
    res.status(400).json({ error: 'event_id and sport required' });
    return;
  }
  const [tournament] = await db
    .insert(tournaments)
    .values({ event_id, format: format ?? 'elimination', sport })
    .returning();
  res.status(201).json(tournament);
});

router.post('/:id/generate', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const tournamentId = req.params.id;

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  const confirmedRsvps = await db
    .select({ member_id: eventRsvps.member_id })
    .from(eventRsvps)
    .where(and(eq(eventRsvps.event_id, tournament.event_id), eq(eventRsvps.status, 'confirmed')));

  const playerIds = confirmedRsvps.map((r) => r.member_id);
  if (playerIds.length < 2) {
    res.status(400).json({ error: 'Need at least 2 confirmed players' });
    return;
  }

  // Fisher-Yates shuffle for seeding
  for (let i = playerIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playerIds[i], playerIds[j]] = [playerIds[j]!, playerIds[i]!];
  }

  const bracketSize = nextPow2(playerIds.length);
  const totalRounds = Math.round(Math.log2(bracketSize));

  const insertValues: (typeof tournamentMatches.$inferInsert)[] = [];
  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = bracketSize / Math.pow(2, round);
    for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
      if (round === 1) {
        const p1 = playerIds[2 * (matchNum - 1)] ?? null;
        const p2 = playerIds[2 * (matchNum - 1) + 1] ?? null;
        const isBye = p1 !== null && p2 === null;
        insertValues.push({
          tournament_id: tournamentId,
          round,
          match_number: matchNum,
          player1_id: p1,
          player2_id: p2,
          status: isBye ? 'bye' : 'pending',
          winner_id: isBye ? p1 : null,
        });
      } else {
        insertValues.push({ tournament_id: tournamentId, round, match_number: matchNum });
      }
    }
  }

  const inserted = await db.insert(tournamentMatches).values(insertValues).returning();

  // Advance bye winners into round 2 slots
  if (totalRounds >= 2) {
    const byeMatches = inserted.filter((m) => m.round === 1 && m.status === 'bye');
    for (const bye of byeMatches) {
      const nextMatchNum = Math.ceil(bye.match_number / 2);
      const isP1Slot = bye.match_number % 2 === 1;
      const nextMatch = inserted.find((m) => m.round === 2 && m.match_number === nextMatchNum);
      if (nextMatch && bye.winner_id) {
        await db
          .update(tournamentMatches)
          .set(isP1Slot ? { player1_id: bye.winner_id } : { player2_id: bye.winner_id })
          .where(eq(tournamentMatches.id, nextMatch.id));
      }
    }
  }

  await db.update(tournaments).set({ status: 'active' }).where(eq(tournaments.id, tournamentId));
  const [updated] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
  res.json({ tournament: updated, matches: inserted });
});

router.get('/:id/bracket', async (req: Request<{ id: string }>, res: Response): Promise<void> => {
  const tournamentId = req.params.id;

  const [tournament] = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId));
  if (!tournament) {
    res.status(404).json({ error: 'Tournament not found' });
    return;
  }

  const matches = await db
    .select()
    .from(tournamentMatches)
    .where(eq(tournamentMatches.tournament_id, tournamentId))
    .orderBy(asc(tournamentMatches.round), asc(tournamentMatches.match_number));

  const playerIdSet = new Set<string>();
  for (const m of matches) {
    if (m.player1_id) playerIdSet.add(m.player1_id);
    if (m.player2_id) playerIdSet.add(m.player2_id);
    if (m.winner_id) playerIdSet.add(m.winner_id);
  }

  const memberNames: Record<string, string> = {};
  if (playerIdSet.size > 0) {
    const memberRows = await db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(inArray(members.id, Array.from(playerIdSet)));
    for (const m of memberRows) memberNames[m.id] = m.name;
  }

  const bracket: Record<number, typeof matches> = {};
  for (const m of matches) {
    if (!bracket[m.round]) bracket[m.round] = [];
    bracket[m.round]!.push(m);
  }

  res.json({ tournament, bracket, memberNames });
});

router.put(
  '/:id/matches/:matchId',
  async (req: Request<{ id: string; matchId: string }>, res: Response): Promise<void> => {
    const { id: tournamentId, matchId } = req.params;
    const { player1_score, player2_score, winner_id } = req.body as {
      player1_score: number;
      player2_score: number;
      winner_id: string;
    };

    const [match] = await db
      .select()
      .from(tournamentMatches)
      .where(and(eq(tournamentMatches.id, matchId), eq(tournamentMatches.tournament_id, tournamentId)));

    if (!match) {
      res.status(404).json({ error: 'Match not found' });
      return;
    }
    if (match.status === 'completed' || match.status === 'bye') {
      res.status(400).json({ error: 'Match already resolved' });
      return;
    }
    if (winner_id !== match.player1_id && winner_id !== match.player2_id) {
      res.status(400).json({ error: 'winner_id must be player1_id or player2_id' });
      return;
    }

    const [updatedMatch] = await db
      .update(tournamentMatches)
      .set({ player1_score, player2_score, winner_id, status: 'completed' })
      .where(eq(tournamentMatches.id, matchId))
      .returning();

    // Auto-advance winner to next round
    const nextMatchNum = Math.ceil(match.match_number / 2);
    const nextRound = match.round + 1;
    const isP1Slot = match.match_number % 2 === 1;

    const [nextMatch] = await db
      .select()
      .from(tournamentMatches)
      .where(
        and(
          eq(tournamentMatches.tournament_id, tournamentId),
          eq(tournamentMatches.round, nextRound),
          eq(tournamentMatches.match_number, nextMatchNum),
        ),
      );

    if (nextMatch) {
      await db
        .update(tournamentMatches)
        .set(isP1Slot ? { player1_id: winner_id } : { player2_id: winner_id })
        .where(eq(tournamentMatches.id, nextMatch.id));
    }

    // Mark tournament complete when no pending matches remain
    const [pendingRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tournamentMatches)
      .where(
        and(
          eq(tournamentMatches.tournament_id, tournamentId),
          not(inArray(tournamentMatches.status, ['completed', 'bye'])),
        ),
      );

    if ((pendingRow?.count ?? 1) === 0) {
      await db.update(tournaments).set({ status: 'completed' }).where(eq(tournaments.id, tournamentId));
    }

    res.json(updatedMatch);
  },
);

export default router;
