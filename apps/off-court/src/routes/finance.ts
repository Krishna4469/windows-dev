import { Router, type Request, type Response } from 'express';
import { and, desc, eq, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { chartOfAccounts, journalEntries, journalLines } from '../db/schema.js';
import { getPnL } from '../services/accounting.js';
import { SAC_CODES, calculateGST, generateGSTR1, generateGSTR3B } from '../services/gst.js';

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

// GET /api/finance/gst/sac-codes
router.get('/gst/sac-codes', (_req: Request, res: Response): void => {
  const codes = Object.entries(SAC_CODES).map(([serviceType, entry]) => ({
    service_type: serviceType,
    sac_code:     entry.sac,
    rate:         entry.rate,
    label:        entry.label,
  }));
  res.json(codes);
});

// GET /api/finance/gst/gstr1?venue_id=&month=&year=
router.get('/gst/gstr1', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, month, year } = req.query;

  if (typeof venue_id !== 'string' || typeof month !== 'string' || typeof year !== 'string') {
    res.status(400).json({ error: 'venue_id, month, year query params are required' });
    return;
  }

  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(m) || m < 1 || m > 12 || isNaN(y)) {
    res.status(400).json({ error: 'month must be 1-12 and year must be a valid number' });
    return;
  }

  const report = await generateGSTR1(venue_id, m, y);
  res.json(report);
});

// GET /api/finance/gst/gstr3b?venue_id=&month=&year=
router.get('/gst/gstr3b', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, month, year } = req.query;

  if (typeof venue_id !== 'string' || typeof month !== 'string' || typeof year !== 'string') {
    res.status(400).json({ error: 'venue_id, month, year query params are required' });
    return;
  }

  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  if (isNaN(m) || m < 1 || m > 12 || isNaN(y)) {
    res.status(400).json({ error: 'month must be 1-12 and year must be a valid number' });
    return;
  }

  const summary = await generateGSTR3B(venue_id, m, y);
  res.json(summary);
});

// POST /api/finance/gst/calculate  body: { amount, service_type }
router.post('/gst/calculate', (req: Request, res: Response): void => {
  const { amount, service_type } = req.body as { amount?: unknown; service_type?: unknown };

  if (typeof amount !== 'number' || typeof service_type !== 'string') {
    res.status(400).json({ error: 'amount (number) and service_type (string) are required' });
    return;
  }

  if (amount < 0) {
    res.status(400).json({ error: 'amount must be non-negative' });
    return;
  }

  if (!SAC_CODES[service_type]) {
    res.status(400).json({ error: `Unknown service_type. Valid values: ${Object.keys(SAC_CODES).join(', ')}` });
    return;
  }

  res.json(calculateGST(amount, service_type));
});

export default router;
