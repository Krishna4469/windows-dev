import { Router, type Request, type Response } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { marketplaceListings, marketplaceTransactions, members } from '../db/schema.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { type, sport } = req.query as { type?: string; sport?: string };

  const conditions = [eq(marketplaceListings.status, 'active')];
  if (type) conditions.push(eq(marketplaceListings.listing_type, type));
  if (sport) conditions.push(eq(marketplaceListings.sport, sport));

  const rows = await db
    .select({
      id: marketplaceListings.id,
      venue_id: marketplaceListings.venue_id,
      seller_id: marketplaceListings.seller_id,
      seller_name: members.name,
      listing_type: marketplaceListings.listing_type,
      title: marketplaceListings.title,
      description: marketplaceListings.description,
      sport: marketplaceListings.sport,
      price_credits: marketplaceListings.price_credits,
      price_inr: marketplaceListings.price_inr,
      duration_minutes: marketplaceListings.duration_minutes,
      max_participants: marketplaceListings.max_participants,
      available_from: marketplaceListings.available_from,
      available_until: marketplaceListings.available_until,
      status: marketplaceListings.status,
      created_at: marketplaceListings.created_at,
    })
    .from(marketplaceListings)
    .innerJoin(members, eq(marketplaceListings.seller_id, members.id))
    .where(and(...conditions))
    .orderBy(desc(marketplaceListings.created_at));

  res.json(rows);
});

interface CreateListingBody {
  venue_id: string;
  seller_id: string;
  listing_type: string;
  title: string;
  description: string;
  sport: string;
  price_credits: number;
  price_inr?: number;
  duration_minutes?: number;
  max_participants?: number;
  available_from: string;
  available_until?: string;
}

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateListingBody;
  const {
    venue_id, seller_id, listing_type, title, description, sport,
    price_credits, price_inr, duration_minutes, max_participants,
    available_from, available_until,
  } = body;

  const validTypes = ['coaching-session', 'equipment-rental', 'court-sublet', 'training-programme', 'guest-pass'];
  if (!venue_id || !seller_id || !listing_type || !title || !description || !sport || price_credits === undefined || !available_from) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  if (!validTypes.includes(listing_type)) {
    res.status(400).json({ error: `listing_type must be one of: ${validTypes.join(', ')}` });
    return;
  }

  const [inserted] = await db.insert(marketplaceListings).values({
    venue_id,
    seller_id,
    listing_type,
    title,
    description,
    sport,
    price_credits: String(price_credits),
    price_inr: price_inr !== undefined ? String(price_inr) : null,
    duration_minutes: duration_minutes ?? null,
    max_participants: max_participants ?? 1,
    available_from: new Date(available_from),
    available_until: available_until ? new Date(available_until) : null,
  }).returning();

  if (!inserted) { res.status(500).json({ error: 'Insert failed' }); return; }
  res.status(201).json(inserted);
});

router.get('/my-listings', async (req: Request, res: Response): Promise<void> => {
  const { seller_id } = req.query as { seller_id?: string };
  if (!seller_id) { res.status(400).json({ error: 'seller_id is required' }); return; }

  const rows = await db
    .select({
      id: marketplaceListings.id,
      listing_type: marketplaceListings.listing_type,
      title: marketplaceListings.title,
      sport: marketplaceListings.sport,
      price_credits: marketplaceListings.price_credits,
      duration_minutes: marketplaceListings.duration_minutes,
      available_from: marketplaceListings.available_from,
      available_until: marketplaceListings.available_until,
      status: marketplaceListings.status,
      created_at: marketplaceListings.created_at,
      transaction_count: sql<number>`(
        select count(*) from marketplace_transactions t
        where t.listing_id = ${marketplaceListings.id}
        and t.status != 'cancelled'
      )`.mapWith(Number),
    })
    .from(marketplaceListings)
    .where(eq(marketplaceListings.seller_id, seller_id))
    .orderBy(desc(marketplaceListings.created_at));

  res.json(rows);
});

router.get('/my-purchases', async (req: Request, res: Response): Promise<void> => {
  const { buyer_id } = req.query as { buyer_id?: string };
  if (!buyer_id) { res.status(400).json({ error: 'buyer_id is required' }); return; }

  const rows = await db
    .select({
      id: marketplaceTransactions.id,
      listing_id: marketplaceTransactions.listing_id,
      listing_title: marketplaceListings.title,
      listing_type: marketplaceListings.listing_type,
      sport: marketplaceListings.sport,
      seller_name: members.name,
      credits_paid: marketplaceTransactions.credits_paid,
      status: marketplaceTransactions.status,
      created_at: marketplaceTransactions.created_at,
    })
    .from(marketplaceTransactions)
    .innerJoin(marketplaceListings, eq(marketplaceTransactions.listing_id, marketplaceListings.id))
    .innerJoin(members, eq(marketplaceTransactions.seller_id, members.id))
    .where(eq(marketplaceTransactions.buyer_id, buyer_id))
    .orderBy(desc(marketplaceTransactions.created_at));

  res.json(rows);
});

router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };

  const rows = await db
    .select({
      id: marketplaceListings.id,
      venue_id: marketplaceListings.venue_id,
      seller_id: marketplaceListings.seller_id,
      seller_name: members.name,
      listing_type: marketplaceListings.listing_type,
      title: marketplaceListings.title,
      description: marketplaceListings.description,
      sport: marketplaceListings.sport,
      price_credits: marketplaceListings.price_credits,
      price_inr: marketplaceListings.price_inr,
      duration_minutes: marketplaceListings.duration_minutes,
      max_participants: marketplaceListings.max_participants,
      available_from: marketplaceListings.available_from,
      available_until: marketplaceListings.available_until,
      status: marketplaceListings.status,
      created_at: marketplaceListings.created_at,
    })
    .from(marketplaceListings)
    .innerJoin(members, eq(marketplaceListings.seller_id, members.id))
    .where(eq(marketplaceListings.id, id));

  if (rows.length === 0) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(rows[0]);
});

interface PurchaseBody {
  buyer_id: string;
}

router.post('/:id/purchase', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const { buyer_id } = req.body as PurchaseBody;

  if (!buyer_id) { res.status(400).json({ error: 'buyer_id is required' }); return; }

  const [listing] = await db.select().from(marketplaceListings).where(eq(marketplaceListings.id, id));
  if (!listing) { res.status(404).json({ error: 'Listing not found' }); return; }
  if (listing.status !== 'active') { res.status(400).json({ error: 'Listing is not active' }); return; }
  if (listing.seller_id === buyer_id) { res.status(400).json({ error: 'Cannot purchase your own listing' }); return; }

  const [buyer] = await db.select({ id: members.id, credit_balance: members.credit_balance }).from(members).where(eq(members.id, buyer_id));
  if (!buyer) { res.status(404).json({ error: 'Buyer not found' }); return; }

  const creditsNeeded = parseFloat(listing.price_credits);
  const buyerBalance = parseFloat(buyer.credit_balance);
  if (buyerBalance < creditsNeeded) {
    res.status(400).json({ error: 'Insufficient credits', balance: buyerBalance, required: creditsNeeded });
    return;
  }

  await db.update(members)
    .set({ credit_balance: String(buyerBalance - creditsNeeded) })
    .where(eq(members.id, buyer_id));

  const [seller] = await db.select({ credit_balance: members.credit_balance }).from(members).where(eq(members.id, listing.seller_id));
  if (seller) {
    await db.update(members)
      .set({ credit_balance: String(parseFloat(seller.credit_balance) + creditsNeeded) })
      .where(eq(members.id, listing.seller_id));
  }

  const [transaction] = await db.insert(marketplaceTransactions).values({
    listing_id: id,
    buyer_id,
    seller_id: listing.seller_id,
    credits_paid: listing.price_credits,
    status: 'confirmed',
  }).returning();

  if (!transaction) { res.status(500).json({ error: 'Transaction failed' }); return; }
  res.status(201).json(transaction);
});

interface UpdateListingBody {
  status?: string;
  title?: string;
  description?: string;
  price_credits?: number;
  available_until?: string;
}

router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const body = req.body as UpdateListingBody;
  const { status, title, description, price_credits, available_until } = body;

  const validStatuses = ['active', 'paused', 'closed'];
  if (status !== undefined && !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const [updated] = await db.update(marketplaceListings)
    .set({
      ...(status !== undefined && { status }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(price_credits !== undefined && { price_credits: String(price_credits) }),
      ...(available_until !== undefined && { available_until: new Date(available_until) }),
    })
    .where(eq(marketplaceListings.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(updated);
});

export default router;
