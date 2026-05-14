import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { displayScreens } from '../db/schema.js';
import {
  pushContentToScreen,
  getScreenContent,
  pushScoreUpdate,
} from '../services/display-cms.js';

const router = Router();

const VALID_SCREEN_TYPES = [
  'court-scoreboard',
  'leaderboard',
  'menu',
  'event',
  'welcome',
  'wayfinding',
] as const;

const VALID_CONTENT_TYPES = ['score', 'leaderboard', 'menu', 'event', 'custom'] as const;

type ScreenType = typeof VALID_SCREEN_TYPES[number];

// GET /api/displays?venue_id=
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;
  if (!venue_id || typeof venue_id !== 'string') {
    res.status(400).json({ error: 'venue_id required' });
    return;
  }

  const screens = await db
    .select()
    .from(displayScreens)
    .where(eq(displayScreens.venue_id, venue_id));

  res.json(screens);
});

// POST /api/displays
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, screen_name, location_label, screen_type, device_id } = req.body as {
    venue_id?: string;
    screen_name?: string;
    location_label?: string;
    screen_type?: string;
    device_id?: string;
  };

  if (!venue_id || !screen_name || !location_label || !screen_type || !device_id) {
    res.status(400).json({ error: 'venue_id, screen_name, location_label, screen_type, device_id required' });
    return;
  }

  if (!VALID_SCREEN_TYPES.includes(screen_type as ScreenType)) {
    res.status(400).json({ error: `screen_type must be one of: ${VALID_SCREEN_TYPES.join(', ')}` });
    return;
  }

  const existing = await db
    .select({ id: displayScreens.id })
    .from(displayScreens)
    .where(eq(displayScreens.device_id, device_id))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: 'device_id already registered' });
    return;
  }

  const [screen] = await db
    .insert(displayScreens)
    .values({ venue_id, screen_name, location_label, screen_type, device_id })
    .returning();

  res.status(201).json(screen);
});

// PUT /api/displays/:id/content
router.put('/:id/content', async (req: Request, res: Response): Promise<void> => {
  const id = req.params['id'] as string;
  const { content_data, content_type } = req.body as {
    content_data?: Record<string, unknown>;
    content_type?: string;
  };

  if (!content_data || !content_type) {
    res.status(400).json({ error: 'content_data and content_type required' });
    return;
  }

  if (!VALID_CONTENT_TYPES.includes(content_type as typeof VALID_CONTENT_TYPES[number])) {
    res.status(400).json({ error: `content_type must be one of: ${VALID_CONTENT_TYPES.join(', ')}` });
    return;
  }

  try {
    await pushContentToScreen(id, content_data, content_type);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(404).json({ error: message });
  }
});

// GET /api/displays/device/:deviceId/content
router.get('/device/:deviceId/content', async (req: Request, res: Response): Promise<void> => {
  const deviceId = req.params['deviceId'] as string;

  const content = await getScreenContent(deviceId);

  if (!content) {
    res.status(204).send();
    return;
  }

  res.json(content);
});

// POST /api/displays/score-update
router.post('/score-update', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, room_id, score_data } = req.body as {
    venue_id?: string;
    room_id?: string;
    score_data?: Record<string, unknown>;
  };

  if (!venue_id || !room_id || !score_data) {
    res.status(400).json({ error: 'venue_id, room_id, score_data required' });
    return;
  }

  await pushScoreUpdate(venue_id, room_id, score_data);
  res.json({ success: true });
});

export default router;
