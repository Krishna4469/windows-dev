import { Router, type Request, type Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { venueLocations } from '../db/schema.js';
import { findNearbyVenues, generateGoogleMapsURL } from '../services/maps.js';

const router = Router();

router.get('/', async (_req: Request, res: Response): Promise<void> => {
  const venues = await db
    .select()
    .from(venueLocations)
    .where(eq(venueLocations.status, 'live'));
  res.json(venues);
});

router.get('/nearby', async (req: Request, res: Response): Promise<void> => {
  const lat = parseFloat(String(req.query['lat'] ?? ''));
  const lng = parseFloat(String(req.query['lng'] ?? ''));
  const radiusKm = parseFloat(String(req.query['radiusKm'] ?? '50'));

  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'lat and lng are required numeric parameters' });
    return;
  }
  if (isNaN(radiusKm) || radiusKm <= 0) {
    res.status(400).json({ error: 'radiusKm must be a positive number' });
    return;
  }

  const all = await db.select().from(venueLocations);
  const nearby = findNearbyVenues(lat, lng, radiusKm, all);
  res.json(nearby);
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const [venue] = await db
    .select()
    .from(venueLocations)
    .where(eq(venueLocations.id, id));

  if (!venue) {
    res.status(404).json({ error: 'Venue not found' });
    return;
  }

  res.json({
    ...venue,
    maps_url: generateGoogleMapsURL(
      parseFloat(String(venue.latitude)),
      parseFloat(String(venue.longitude)),
      venue.venue_name,
    ),
  });
});

export default router;
