import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { arWaypoints, arNavigationSessions } from '../db/schema.js';
import { findShortestPath, generateARDirections } from '../services/wayfinding.js';

const router = Router();

// GET /api/ar/waypoints?venueId=
router.get('/waypoints', async (req: Request, res: Response): Promise<void> => {
  const { venueId } = req.query;
  if (typeof venueId !== 'string') {
    res.status(400).json({ error: 'venueId required' });
    return;
  }
  const waypoints = await db.select().from(arWaypoints).where(eq(arWaypoints.venue_id, venueId));
  res.json(waypoints);
});

// POST /api/ar/waypoints
router.post('/waypoints', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as {
    venue_id?: unknown;
    label?: unknown;
    room_id?: unknown;
    floor_number?: unknown;
    x_position?: unknown;
    y_position?: unknown;
    z_position?: unknown;
    waypoint_type?: unknown;
    connected_to?: unknown;
  };

  if (
    typeof body.venue_id !== 'string' ||
    typeof body.label !== 'string' ||
    typeof body.waypoint_type !== 'string'
  ) {
    res.status(400).json({ error: 'venue_id, label, waypoint_type required' });
    return;
  }

  const xPos = Number(body.x_position);
  const yPos = Number(body.y_position);
  if (isNaN(xPos) || isNaN(yPos)) {
    res.status(400).json({ error: 'x_position and y_position must be numeric' });
    return;
  }

  const [waypoint] = await db
    .insert(arWaypoints)
    .values({
      venue_id: body.venue_id,
      label: body.label,
      room_id: typeof body.room_id === 'string' ? body.room_id : null,
      floor_number: typeof body.floor_number === 'number' ? body.floor_number : 0,
      x_position: String(xPos),
      y_position: String(yPos),
      z_position: String(Number(body.z_position ?? 0)),
      waypoint_type: body.waypoint_type,
      connected_to: Array.isArray(body.connected_to) ? body.connected_to : [],
    })
    .returning();

  res.status(201).json(waypoint);
});

// GET /api/ar/navigate?from=&to=&venueId=
router.get('/navigate', async (req: Request, res: Response): Promise<void> => {
  const { from, to, venueId } = req.query;
  if (typeof from !== 'string' || typeof to !== 'string' || typeof venueId !== 'string') {
    res.status(400).json({ error: 'from, to, venueId required' });
    return;
  }

  const waypoints = await db.select().from(arWaypoints).where(eq(arWaypoints.venue_id, venueId));
  const records = waypoints as Array<Record<string, unknown>>;

  const path = findShortestPath(from, to, records);
  if (path.length === 0) {
    res.status(404).json({ error: 'No path found between waypoints' });
    return;
  }

  const directions = generateARDirections(path, records);
  res.json({ path, directions });
});

// POST /api/ar/sessions
router.post('/sessions', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as {
    venue_id?: unknown;
    member_id?: unknown;
    from_waypoint_id?: unknown;
    to_waypoint_id?: unknown;
  };

  if (
    typeof body.venue_id !== 'string' ||
    typeof body.member_id !== 'string' ||
    typeof body.from_waypoint_id !== 'string' ||
    typeof body.to_waypoint_id !== 'string'
  ) {
    res.status(400).json({ error: 'venue_id, member_id, from_waypoint_id, to_waypoint_id required' });
    return;
  }

  const [session] = await db
    .insert(arNavigationSessions)
    .values({
      venue_id: body.venue_id,
      member_id: body.member_id,
      from_waypoint_id: body.from_waypoint_id,
      to_waypoint_id: body.to_waypoint_id,
    })
    .returning();

  res.status(201).json(session);
});

// PUT /api/ar/sessions/:id/complete
router.put('/sessions/:id/complete', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (typeof id !== 'string') {
    res.status(400).json({ error: 'session id required' });
    return;
  }

  const [session] = await db
    .update(arNavigationSessions)
    .set({ completed_at: new Date() })
    .where(eq(arNavigationSessions.id, id))
    .returning();

  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.json(session);
});

export default router;
