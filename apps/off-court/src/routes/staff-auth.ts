import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db/client.js';
import { staffClockinEvents, staffMembers } from '../db/schema.js';
import {
  enrollFaceProfile,
  processFaceClockin,
  processFaceClockout,
} from '../services/face-recognition.js';
import { eq, and, gte } from 'drizzle-orm';

const router = Router();

router.post('/enroll-face', async (req: Request, res: Response): Promise<void> => {
  const { staffId, embeddingVector } = req.body as {
    staffId: string;
    embeddingVector: number[];
  };
  if (!staffId || !Array.isArray(embeddingVector)) {
    res.status(400).json({ error: 'staffId and embeddingVector required' });
    return;
  }
  await enrollFaceProfile(staffId, embeddingVector);
  res.json({ ok: true });
});

router.post('/clockin-face', async (req: Request, res: Response): Promise<void> => {
  const { venueId, embeddingVector, zone, deviceId } = req.body as {
    venueId: string;
    embeddingVector: number[];
    zone: string;
    deviceId: string;
  };
  if (!venueId || !Array.isArray(embeddingVector) || !zone || !deviceId) {
    res.status(400).json({ error: 'venueId, embeddingVector, zone, deviceId required' });
    return;
  }
  const result = await processFaceClockin(venueId, embeddingVector, zone, deviceId);
  if (!result) {
    res.status(401).json({ error: 'No matching staff face found' });
    return;
  }
  res.json(result);
});

router.post('/clockout', async (req: Request, res: Response): Promise<void> => {
  const { staffId, venueId } = req.body as { staffId: string; venueId: string };
  if (!staffId || !venueId) {
    res.status(400).json({ error: 'staffId and venueId required' });
    return;
  }
  await processFaceClockout(staffId, venueId);
  res.json({ ok: true });
});

router.get('/clockin-today', async (req: Request, res: Response): Promise<void> => {
  const venueId = req.query['venueId'] as string;
  if (!venueId) {
    res.status(400).json({ error: 'venueId required' });
    return;
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      id: staffClockinEvents.id,
      staff_id: staffClockinEvents.staff_id,
      staff_name: staffMembers.name,
      clockin_method: staffClockinEvents.clockin_method,
      zone: staffClockinEvents.zone,
      clocked_in_at: staffClockinEvents.clocked_in_at,
      clocked_out_at: staffClockinEvents.clocked_out_at,
    })
    .from(staffClockinEvents)
    .innerJoin(staffMembers, eq(staffClockinEvents.staff_id, staffMembers.id))
    .where(
      and(
        eq(staffClockinEvents.venue_id, venueId),
        gte(staffClockinEvents.clocked_in_at, todayStart),
      ),
    );

  const response = rows.map((r) => {
    const inAt = r.clocked_in_at;
    const outAt = r.clocked_out_at;
    const durationMinutes =
      outAt !== null
        ? Math.round((outAt.getTime() - inAt.getTime()) / 60000)
        : null;
    return {
      id: r.id,
      staff_id: r.staff_id,
      staff_name: r.staff_name,
      clockin_method: r.clockin_method,
      zone: r.zone ?? null,
      clocked_in_at: inAt.toISOString(),
      clocked_out_at: outAt?.toISOString() ?? null,
      duration_minutes: durationMinutes,
    };
  });

  res.json(response);
});

export default router;
