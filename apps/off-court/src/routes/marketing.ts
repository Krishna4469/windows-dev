import { Router, type Request, type Response } from 'express';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { memberSegments, marketingCampaigns, campaignLogs, members } from '../db/schema.js';
import { suggestCampaigns, refineCampaignMessage } from '../services/campaign-claude.js';
import { scheduleDailyCampaigns } from '../services/auto-campaigns.js';
import { generateRailCameraContent } from '../services/rail-camera.js';

const router = Router();

const VALID_CHANNELS = ['whatsapp', 'email', 'instagram'] as const;
const VALID_CAMPAIGN_TYPES = ['welcome', 'birthday', 'win-back', 'event-promo', 'achievement', 'seasonal'] as const;
const VALID_STATUSES = ['draft', 'scheduled', 'running', 'completed', 'cancelled'] as const;

// ── Segments ──────────────────────────────────────────────────────────────────

// GET /segments
router.get('/segments', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;

  const rows = await db
    .select()
    .from(memberSegments)
    .where(typeof venue_id === 'string' ? eq(memberSegments.venue_id, venue_id) : undefined)
    .orderBy(desc(memberSegments.created_at));

  res.json(rows);
});

// POST /segments/compute — recompute member_count for all segments of a venue
router.post('/segments/compute', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.body as { venue_id?: string };

  if (!venue_id) {
    res.status(400).json({ error: 'venue_id is required' });
    return;
  }

  const segments = await db
    .select()
    .from(memberSegments)
    .where(eq(memberSegments.venue_id, venue_id));

  const updated: (typeof memberSegments.$inferSelect)[] = [];

  for (const seg of segments) {
    const [row] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(members)
      .where(
        sql`${members.venue_id} = ${venue_id} AND ${members.segment} = ${seg.segment_name}`,
      );

    const [updatedSeg] = await db
      .update(memberSegments)
      .set({ member_count: row?.c ?? 0, last_computed_at: new Date() })
      .where(eq(memberSegments.id, seg.id))
      .returning();

    if (updatedSeg) updated.push(updatedSeg);
  }

  res.json({ updated });
});

// ── Campaigns ─────────────────────────────────────────────────────────────────

// GET /campaigns
router.get('/campaigns', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, status } = req.query;

  const rows = await db
    .select()
    .from(marketingCampaigns)
    .where(
      typeof venue_id === 'string'
        ? typeof status === 'string'
          ? sql`${marketingCampaigns.venue_id} = ${venue_id} AND ${marketingCampaigns.status} = ${status}`
          : eq(marketingCampaigns.venue_id, venue_id)
        : typeof status === 'string'
          ? eq(marketingCampaigns.status, status)
          : undefined,
    )
    .orderBy(desc(marketingCampaigns.created_at));

  res.json(rows);
});

// POST /campaigns
interface CreateCampaignBody {
  venue_id: string;
  campaign_name: string;
  segment_id?: string;
  channel: string;
  campaign_type: string;
  message_template: string;
  scheduled_at?: string;
  created_by: string;
}

router.post('/campaigns', async (req: Request, res: Response): Promise<void> => {
  const {
    venue_id,
    campaign_name,
    segment_id,
    channel,
    campaign_type,
    message_template,
    scheduled_at,
    created_by,
  } = req.body as CreateCampaignBody;

  if (!venue_id || !campaign_name || !channel || !campaign_type || !message_template || !created_by) {
    res.status(400).json({
      error: 'venue_id, campaign_name, channel, campaign_type, message_template, created_by are required',
    });
    return;
  }

  if (!(VALID_CHANNELS as readonly string[]).includes(channel)) {
    res.status(400).json({ error: `channel must be one of: ${VALID_CHANNELS.join(', ')}` });
    return;
  }

  if (!(VALID_CAMPAIGN_TYPES as readonly string[]).includes(campaign_type)) {
    res.status(400).json({ error: `campaign_type must be one of: ${VALID_CAMPAIGN_TYPES.join(', ')}` });
    return;
  }

  const [campaign] = await db
    .insert(marketingCampaigns)
    .values({
      venue_id,
      campaign_name,
      segment_id: segment_id ?? null,
      channel,
      campaign_type,
      message_template,
      status: 'draft',
      scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
      created_by,
    })
    .returning();

  res.status(201).json(campaign);
});

// PUT /campaigns/:id
interface UpdateCampaignBody {
  campaign_name?: string;
  status?: string;
  message_template?: string;
  scheduled_at?: string;
  segment_id?: string;
}

router.put('/campaigns/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { campaign_name, status, message_template, scheduled_at, segment_id } =
    req.body as UpdateCampaignBody;

  if (
    campaign_name === undefined &&
    status === undefined &&
    message_template === undefined &&
    scheduled_at === undefined &&
    segment_id === undefined
  ) {
    res.status(400).json({ error: 'Provide at least one field to update' });
    return;
  }

  if (status !== undefined && !(VALID_STATUSES as readonly string[]).includes(status)) {
    res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }

  const setClause: Partial<{
    campaign_name: string;
    status: string;
    message_template: string;
    scheduled_at: Date | null;
    segment_id: string | null;
  }> = {};

  if (campaign_name !== undefined) setClause.campaign_name = campaign_name;
  if (status !== undefined) setClause.status = status;
  if (message_template !== undefined) setClause.message_template = message_template;
  if (scheduled_at !== undefined) setClause.scheduled_at = scheduled_at ? new Date(scheduled_at) : null;
  if (segment_id !== undefined) setClause.segment_id = segment_id || null;

  const [campaign] = await db
    .update(marketingCampaigns)
    .set(setClause)
    .where(eq(marketingCampaigns.id, id))
    .returning();

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  res.json(campaign);
});

// POST /campaigns/suggest
router.post('/campaigns/suggest', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.body as { venue_id?: string };

  if (!venue_id) {
    res.status(400).json({ error: 'venue_id is required' });
    return;
  }

  const suggestions = await suggestCampaigns(venue_id);
  res.json(suggestions);
});

// POST /campaigns/:id/refine
interface RefineBody {
  segment: string;
  tone: string;
}

router.post('/campaigns/:id/refine', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { segment, tone } = req.body as RefineBody;

  if (!segment || !tone) {
    res.status(400).json({ error: 'segment and tone are required' });
    return;
  }

  const [campaign] = await db
    .select()
    .from(marketingCampaigns)
    .where(eq(marketingCampaigns.id, id));

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const refined = await refineCampaignMessage(campaign.message_template, segment, tone);

  res.json({ refined });
});

// ── Campaign logs ─────────────────────────────────────────────────────────────

// GET /campaigns/:id/logs
router.get('/campaigns/:id/logs', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const [campaign] = await db
    .select()
    .from(marketingCampaigns)
    .where(eq(marketingCampaigns.id, id));

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const logs = await db
    .select()
    .from(campaignLogs)
    .where(eq(campaignLogs.campaign_id, id))
    .orderBy(desc(campaignLogs.sent_at));

  res.json(logs);
});

// ── Auto-campaigns ────────────────────────────────────────────────────────────

// POST /auto-campaigns/trigger
router.post('/auto-campaigns/trigger', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.body as { venue_id?: string };

  if (!venue_id) {
    res.status(400).json({ error: 'venue_id is required' });
    return;
  }

  scheduleDailyCampaigns(venue_id);
  res.status(202).json({ message: 'Daily campaigns triggered', venue_id });
});

// ── Rail camera ───────────────────────────────────────────────────────────────

// POST /rail-camera/:sessionId
router.post('/rail-camera/:sessionId', async (req: Request, res: Response): Promise<void> => {
  const { sessionId } = req.params as { sessionId: string };

  const content = await generateRailCameraContent(sessionId);
  res.json(content);
});

export default router;
