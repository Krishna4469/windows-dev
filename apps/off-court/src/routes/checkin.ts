import { Router, type Request, type Response } from 'express';
import { db } from '../db/client.js';
import { checkinEvents, members } from '../db/schema.js';
import { eq, and, gte } from 'drizzle-orm';
import {
  processCheckin,
  processCheckout,
  detectBLECheckin,
  generateQRCode,
} from '../services/checkin.js';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { memberId, venueId, method, deviceId, locationLabel } = req.body as {
    memberId: string;
    venueId: string;
    method: string;
    deviceId?: string;
    locationLabel?: string;
  };

  if (!memberId || !venueId || !method) {
    res.status(400).json({ error: 'memberId, venueId, and method are required' });
    return;
  }

  const validMethods = ['ble', 'nfc', 'manual', 'qr'];
  if (!validMethods.includes(method)) {
    res.status(400).json({ error: `method must be one of: ${validMethods.join(', ')}` });
    return;
  }

  try {
    const result = await processCheckin(memberId, venueId, method, deviceId, locationLabel);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkin failed';
    res.status(400).json({ error: message });
  }
});

router.post('/checkout', async (req: Request, res: Response): Promise<void> => {
  const { memberId, venueId } = req.body as { memberId: string; venueId: string };

  if (!memberId || !venueId) {
    res.status(400).json({ error: 'memberId and venueId are required' });
    return;
  }

  try {
    await processCheckout(memberId, venueId);
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    res.status(400).json({ error: message });
  }
});

router.post('/ble-detect', async (req: Request, res: Response): Promise<void> => {
  const { macAddress, venueId } = req.body as { macAddress: string; venueId: string };

  if (!macAddress || !venueId) {
    res.status(400).json({ error: 'macAddress and venueId are required' });
    return;
  }

  const zone = await detectBLECheckin(macAddress, venueId);
  if (!zone) {
    res.status(404).json({ error: 'BLE device not found' });
    return;
  }

  res.json({ zone });
});

router.get('/qr/:memberId', (req: Request, res: Response): void => {
  const { memberId } = req.params as { memberId: string };
  const qrPayload = generateQRCode(memberId);
  res.json({ qrPayload });
});

router.get('/today', async (req: Request, res: Response): Promise<void> => {
  const venueId = req.query['venueId'] as string | undefined;

  if (!venueId) {
    res.status(400).json({ error: 'venueId query param is required' });
    return;
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      id: checkinEvents.id,
      member_id: checkinEvents.member_id,
      member_name: members.name,
      checkin_method: checkinEvents.checkin_method,
      device_id: checkinEvents.device_id,
      location_label: checkinEvents.location_label,
      checked_in_at: checkinEvents.checked_in_at,
      checked_out_at: checkinEvents.checked_out_at,
    })
    .from(checkinEvents)
    .innerJoin(members, eq(checkinEvents.member_id, members.id))
    .where(
      and(
        eq(checkinEvents.venue_id, venueId),
        gte(checkinEvents.checked_in_at, startOfDay),
      ),
    );

  res.json(rows);
});

export default router;
