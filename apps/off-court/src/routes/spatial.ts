import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { rooms } from '../db/schema.js';
import {
  getSpatialOSRooms,
  getSpatialOSOverlays,
  pushBookingToSpatialOS,
  getSpatialOSViewerEmbed,
} from '../services/spatial-os-api.js';

const router = Router();

// GET /api/spatial/rooms?venueId=
router.get('/rooms', async (req: Request, res: Response): Promise<void> => {
  const { venueId } = req.query;
  if (typeof venueId !== 'string') {
    res.status(400).json({ error: 'venueId required' });
    return;
  }

  const remote = await getSpatialOSRooms(venueId);
  if (remote.length > 0) {
    res.json(remote);
    return;
  }

  const local = await db
    .select()
    .from(rooms)
    .where(eq(rooms.venue_id, venueId));

  res.json(local);
});

// GET /api/spatial/overlays/:type?venueId=
router.get('/overlays/:type', async (req: Request, res: Response): Promise<void> => {
  const { venueId } = req.query;
  const overlayType = req.params['type'] as string;

  if (typeof venueId !== 'string') {
    res.status(400).json({ error: 'venueId required' });
    return;
  }

  const overlays = await getSpatialOSOverlays(venueId, overlayType);
  res.json(overlays);
});

// POST /api/spatial/sync  { venueId }
router.post('/sync', async (req: Request, res: Response): Promise<void> => {
  const { venueId } = req.body as { venueId?: unknown };
  if (typeof venueId !== 'string') {
    res.status(400).json({ error: 'venueId required' });
    return;
  }

  const local = await db
    .select()
    .from(rooms)
    .where(eq(rooms.venue_id, venueId));

  let synced = 0;
  for (const room of local) {
    await pushBookingToSpatialOS(venueId, room.id, {
      name: room.name,
      capacity: room.capacity,
    });
    synced++;
  }

  res.json({ success: true, synced, viewerEmbed: getSpatialOSViewerEmbed(venueId) });
});

// GET /api/spatial/viewer-embed?venueId=
router.get('/viewer-embed', (req: Request, res: Response): void => {
  const { venueId } = req.query;
  if (typeof venueId !== 'string') {
    res.status(400).json({ error: 'venueId required' });
    return;
  }
  res.json({ url: getSpatialOSViewerEmbed(venueId) });
});

export default router;
