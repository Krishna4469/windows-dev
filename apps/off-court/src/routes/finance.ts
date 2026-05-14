import { Router, type Request, type Response } from 'express';
import { and, desc, eq, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { chartOfAccounts, journalEntries, journalLines } from '../db/schema.js';
import { getPnL } from '../services/accounting.js';

const router = Router();

// GET /api/finance/pnl?venue_id=&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/pnl', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, from, to } = req.query;

  if (typeof venue_id !== 'string' || typeof from !== 'string' || typeof to !== 'string') {
    res.status(400).json({ error: 'venue_id, from, to query params are required' });
    return;
  }

  const pnl = await getPnL(venue_id, from, to);
  res.json(pnl);
});

// GET /api/finance/accounts?venue_id=&account_type=
router.get('/accounts', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, account_type } = req.query;

  if (typeof venue_id !== 'string') {
    res.status(400).json({ error: 'venue_id query param is required' });
    return;
  }

  const rows = await db
    .select()
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.venue_id, venue_id),
        typeof account_type === 'string' ? eq(chartOfAccounts.account_type, account_type) : undefined,
      ),
    )
    .orderBy(chartOfAccounts.account_code);

  res.json(rows);
});

// GET /api/finance/journal?venue_id=&from=&to=&page=
const PAGE_SIZE = 20;

router.get('/journal', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, from, to, page } = req.query;

  if (typeof venue_id !== 'string') {
    res.status(400).json({ error: 'venue_id query param is required' });
    return;
  }

  const pageNum = typeof page === 'string' ? Math.max(1, parseInt(page, 10) || 1) : 1;
  const offset  = (pageNum - 1) * PAGE_SIZE;

  const entries = await db
    .select()
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.venue_id, venue_id),
        typeof from === 'string' ? gte(journalEntries.entry_date, from) : undefined,
        typeof to   === 'string' ? lte(journalEntries.entry_date, to)   : undefined,
      ),
    )
    .orderBy(desc(journalEntries.entry_date))
    .limit(PAGE_SIZE)
    .offset(offset);

  if (entries.length === 0) {
    res.json({ entries: [], page: pageNum });
    return;
  }

  const entryIds = entries.map((e) => e.id);

  const lines = await db
    .select()
    .from(journalLines)
    .where(inArray(journalLines.journal_id, entryIds));

  const linesByEntry = new Map<string, typeof lines>();
  for (const line of lines) {
    const bucket = linesByEntry.get(line.journal_id) ?? [];
    bucket.push(line);
    linesByEntry.set(line.journal_id, bucket);
  }

  const result = entries.map((entry) => ({
    ...entry,
    lines: linesByEntry.get(entry.id) ?? [],
  }));

  res.json({ entries: result, page: pageNum });
});

export default router;
