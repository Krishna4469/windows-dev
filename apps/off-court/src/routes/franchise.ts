import { Router, type Request, type Response } from 'express';
import { desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { franchiseVenues, venueMetrics } from '../db/schema.js';
import { generateInvestorReport, formatInvestorReportText } from '../services/investor-report.js';

const router = Router();

const VALID_STATUSES = ['prospect', 'onboarding', 'live', 'paused'] as const;

// GET /venues
router.get('/venues', async (req: Request, res: Response): Promise<void> => {
  const { franchisor_id } = req.query;

  const rows = await db
    .select()
    .from(franchiseVenues)
    .where(typeof franchisor_id === 'string' ? eq(franchiseVenues.franchisor_id, franchisor_id) : undefined)
    .orderBy(desc(franchiseVenues.created_at));

  res.json(rows);
});

// POST /venues
interface CreateVenueBody {
  franchisor_id: string;
  venue_name: string;
  city: string;
  country?: string;
  operator_name: string;
  operator_phone: string;
  launch_date?: string;
  status?: string;
  monthly_fee_inr: number | string;
  revenue_share_pct?: number | string;
}

router.post('/venues', async (req: Request, res: Response): Promise<void> => {
  const {
    franchisor_id,
    venue_name,
    city,
    country,
    operator_name,
    operator_phone,
    launch_date,
    status,
    monthly_fee_inr,
    revenue_share_pct,
  } = req.body as CreateVenueBody;

  if (!franchisor_id || !venue_name || !city || !operator_name || !operator_phone || monthly_fee_inr === undefined) {
    res.status(400).json({
      error: 'franchisor_id, venue_name, city, operator_name, operator_phone, monthly_fee_inr are required',
    });
    return;
  }

  if (status !== undefined && !(VALID_STATUSES as readonly string[]).includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  const [venue] = await db
    .insert(franchiseVenues)
    .values({
      franchisor_id,
      venue_name,
      city,
      country: country ?? 'India',
      operator_name,
      operator_phone,
      launch_date: launch_date ?? null,
      status: status ?? 'prospect',
      monthly_fee_inr: String(monthly_fee_inr),
      revenue_share_pct: revenue_share_pct !== undefined ? String(revenue_share_pct) : '8',
    })
    .returning();

  res.status(201).json(venue);
});

// PUT /venues/:id
interface UpdateVenueBody {
  venue_name?: string;
  city?: string;
  country?: string;
  operator_name?: string;
  operator_phone?: string;
  launch_date?: string | null;
  status?: string;
  monthly_fee_inr?: number | string;
  revenue_share_pct?: number | string;
}

router.put('/venues/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const {
    venue_name,
    city,
    country,
    operator_name,
    operator_phone,
    launch_date,
    status,
    monthly_fee_inr,
    revenue_share_pct,
  } = req.body as UpdateVenueBody;

  if (
    venue_name === undefined &&
    city === undefined &&
    country === undefined &&
    operator_name === undefined &&
    operator_phone === undefined &&
    launch_date === undefined &&
    status === undefined &&
    monthly_fee_inr === undefined &&
    revenue_share_pct === undefined
  ) {
    res.status(400).json({ error: 'Provide at least one field to update' });
    return;
  }

  if (status !== undefined && !(VALID_STATUSES as readonly string[]).includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  const setClause: Partial<{
    venue_name: string;
    city: string;
    country: string;
    operator_name: string;
    operator_phone: string;
    launch_date: string | null;
    status: string;
    monthly_fee_inr: string;
    revenue_share_pct: string;
  }> = {};

  if (venue_name !== undefined) setClause.venue_name = venue_name;
  if (city !== undefined) setClause.city = city;
  if (country !== undefined) setClause.country = country;
  if (operator_name !== undefined) setClause.operator_name = operator_name;
  if (operator_phone !== undefined) setClause.operator_phone = operator_phone;
  if (launch_date !== undefined) setClause.launch_date = launch_date || null;
  if (status !== undefined) setClause.status = status;
  if (monthly_fee_inr !== undefined) setClause.monthly_fee_inr = String(monthly_fee_inr);
  if (revenue_share_pct !== undefined) setClause.revenue_share_pct = String(revenue_share_pct);

  const [venue] = await db
    .update(franchiseVenues)
    .set(setClause)
    .where(eq(franchiseVenues.id, id))
    .returning();

  if (!venue) {
    res.status(404).json({ error: 'Venue not found' });
    return;
  }

  res.json(venue);
});

// POST /venues/:id/metrics
interface CreateMetricsBody {
  metric_date: string;
  total_members?: number;
  active_members?: number;
  monthly_revenue_inr?: number | string;
  court_utilisation_pct?: number | string;
  nps_score?: number | string;
}

router.post('/venues/:id/metrics', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const {
    metric_date,
    total_members,
    active_members,
    monthly_revenue_inr,
    court_utilisation_pct,
    nps_score,
  } = req.body as CreateMetricsBody;

  if (!metric_date) {
    res.status(400).json({ error: 'metric_date is required' });
    return;
  }

  const [existing] = await db
    .select({ id: franchiseVenues.id })
    .from(franchiseVenues)
    .where(eq(franchiseVenues.id, id));

  if (!existing) {
    res.status(404).json({ error: 'Venue not found' });
    return;
  }

  const [metric] = await db
    .insert(venueMetrics)
    .values({
      venue_id: id,
      metric_date,
      total_members: total_members ?? 0,
      active_members: active_members ?? 0,
      monthly_revenue_inr: monthly_revenue_inr !== undefined ? String(monthly_revenue_inr) : '0',
      court_utilisation_pct: court_utilisation_pct !== undefined ? String(court_utilisation_pct) : '0',
      nps_score: nps_score !== undefined ? String(nps_score) : null,
    })
    .returning();

  res.status(201).json(metric);
});

// GET /venues/:id/metrics
router.get('/venues/:id/metrics', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const [existing] = await db
    .select({ id: franchiseVenues.id })
    .from(franchiseVenues)
    .where(eq(franchiseVenues.id, id));

  if (!existing) {
    res.status(404).json({ error: 'Venue not found' });
    return;
  }

  const rows = await db
    .select()
    .from(venueMetrics)
    .where(eq(venueMetrics.venue_id, id))
    .orderBy(desc(venueMetrics.metric_date));

  res.json(rows);
});

// GET /portfolio
router.get('/portfolio', async (req: Request, res: Response): Promise<void> => {
  const { franchisor_id } = req.query;

  if (typeof franchisor_id !== 'string') {
    res.status(400).json({ error: 'franchisor_id is required' });
    return;
  }

  const venues = await db
    .select()
    .from(franchiseVenues)
    .where(eq(franchiseVenues.franchisor_id, franchisor_id));

  const venuesByStatus: Record<string, number> = { prospect: 0, onboarding: 0, live: 0, paused: 0 };
  for (const v of venues) {
    const s = v.status ?? 'prospect';
    venuesByStatus[s] = (venuesByStatus[s] ?? 0) + 1;
  }

  let totalMembers = 0;
  let totalRevenue = 0;
  let totalUtilisation = 0;
  let utilCount = 0;
  let bestVenue: { id: string; venue_name: string; monthly_revenue_inr: number } | null = null;

  for (const venue of venues) {
    const [latest] = await db
      .select()
      .from(venueMetrics)
      .where(eq(venueMetrics.venue_id, venue.id))
      .orderBy(desc(venueMetrics.metric_date))
      .limit(1);

    if (latest) {
      const rev  = parseFloat(String(latest.monthly_revenue_inr ?? '0'));
      const util = parseFloat(String(latest.court_utilisation_pct ?? '0'));
      totalMembers    += latest.total_members ?? 0;
      totalRevenue    += rev;
      totalUtilisation += util;
      utilCount++;
      if (!bestVenue || rev > bestVenue.monthly_revenue_inr) {
        bestVenue = { id: venue.id, venue_name: venue.venue_name, monthly_revenue_inr: rev };
      }
    }
  }

  res.json({
    total_venues: venues.length,
    venues_by_status: venuesByStatus,
    total_members: totalMembers,
    total_monthly_revenue_inr: totalRevenue,
    avg_court_utilisation_pct: utilCount > 0 ? Math.round((totalUtilisation / utilCount) * 10) / 10 : 0,
    best_performing_venue: bestVenue,
  });
});

// GET /venues/:id/investor-report?month&year
router.get('/venues/:id/investor-report', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const now = new Date();
  const month = parseInt(String(req.query['month'] ?? now.getMonth() + 1), 10);
  const year  = parseInt(String(req.query['year']  ?? now.getFullYear()), 10);

  if (isNaN(month) || month < 1 || month > 12) {
    res.status(400).json({ error: 'month must be 1–12' });
    return;
  }
  if (isNaN(year) || year < 2000 || year > 2100) {
    res.status(400).json({ error: 'year must be a valid 4-digit year' });
    return;
  }

  const [existing] = await db
    .select({ id: franchiseVenues.id })
    .from(franchiseVenues)
    .where(eq(franchiseVenues.id, id));

  if (!existing) {
    res.status(404).json({ error: 'Venue not found' });
    return;
  }

  const report = await generateInvestorReport(id, month, year);
  res.json(report);
});

const SETUP_COSTS = [
  { item: 'Fit-out & Civil Works',        amount_inr: 3500000 },
  { item: 'Sports Equipment & Courts',    amount_inr: 2000000 },
  { item: 'Technology & POS Systems',     amount_inr:  800000 },
  { item: 'Furniture & Fixtures',         amount_inr:  700000 },
  { item: 'Working Capital Reserve',      amount_inr: 1000000 },
  { item: 'Franchise Fee',                amount_inr:  500000 },
];

function buildMonthlyEbitda(): Array<{ month: number; ebitda: number; cumulative: number }> {
  // Piecewise-linear key points [month, monthly_ebitda_inr]
  const pts: [number, number][] = [
    [0, -150000], [1, -100000], [2, -80000], [3, -50000], [4, -20000],
    [5, 20000],   [6, 60000],   [7, 100000], [8, 140000], [9, 180000],
    [10, 220000], [11, 260000], [12, 300000], [15, 350000], [18, 400000],
    [21, 440000], [24, 480000], [27, 510000], [28, 530000], [30, 548000],
    [33, 565000], [36, 580000],
  ];

  function lerp(m: number): number {
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1]!;
      const [x1, y1] = pts[i]!;
      if (m >= x0 && m <= x1) {
        const t = (m - x0) / (x1 - x0);
        return Math.round(y0 + t * (y1 - y0));
      }
    }
    return 580000;
  }

  let cumulative = 0;
  return Array.from({ length: 36 }, (_, i) => {
    const month  = i + 1;
    const ebitda = lerp(month);
    cumulative  += ebitda;
    return { month, ebitda, cumulative };
  });
}

// GET /venues/:id/investment-model
router.get('/venues/:id/investment-model', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const [existing] = await db
    .select({ id: franchiseVenues.id })
    .from(franchiseVenues)
    .where(eq(franchiseVenues.id, id));

  if (!existing) {
    res.status(404).json({ error: 'Venue not found' });
    return;
  }

  res.json({
    venue_id:       id,
    total_setup_cost_inr: 8500000,
    payback_months:       28,
    irr_pct:              34,
    setup_costs:          SETUP_COSTS,
    monthly_ebitda:       buildMonthlyEbitda(),
  });
});

export { generateInvestorReport, formatInvestorReportText };

export default router;
