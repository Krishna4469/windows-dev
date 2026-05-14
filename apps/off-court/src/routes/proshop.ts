import { Router, type Request, type Response } from 'express';
import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { proShopItems, proShopOrders, csrContributions, members } from '../db/schema.js';

const router = Router();

router.get('/items', async (req: Request, res: Response): Promise<void> => {
  const { category } = req.query;
  const result = await db
    .select()
    .from(proShopItems)
    .where(
      and(
        eq(proShopItems.status, 'active'),
        typeof category === 'string' ? eq(proShopItems.category, category) : undefined,
      ),
    )
    .orderBy(asc(proShopItems.name));
  res.json(result);
});

interface PurchaseBody {
  venue_id: string;
  member_id: string;
  item_id: string;
  quantity?: number;
}

router.post('/orders', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, member_id, item_id, quantity = 1 } = req.body as PurchaseBody;

  if (!venue_id || !member_id || !item_id) {
    res.status(400).json({ error: 'venue_id, member_id, and item_id are required' });
    return;
  }

  const [item] = await db.select().from(proShopItems).where(eq(proShopItems.id, item_id));
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  if (item.stock_quantity < quantity) {
    res.status(400).json({ error: 'Insufficient stock', available: item.stock_quantity });
    return;
  }

  const [member] = await db.select().from(members).where(eq(members.id, member_id));
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const totalCredits = Number(item.price_credits) * quantity;
  const balance = Number(member.credit_balance);
  if (balance < totalCredits) {
    res.status(400).json({ error: 'Insufficient credits', balance, required: totalCredits });
    return;
  }

  await db
    .update(members)
    .set({ credit_balance: String(balance - totalCredits) })
    .where(eq(members.id, member_id));

  await db
    .update(proShopItems)
    .set({ stock_quantity: item.stock_quantity - quantity })
    .where(eq(proShopItems.id, item_id));

  const [order] = await db
    .insert(proShopOrders)
    .values({
      venue_id,
      member_id,
      item_id,
      quantity,
      credits_charged: String(totalCredits),
      status: 'pending',
    })
    .returning();

  res.status(201).json(order);
});

router.get('/orders', async (req: Request, res: Response): Promise<void> => {
  const { member_id } = req.query;
  if (typeof member_id !== 'string') {
    res.status(400).json({ error: 'member_id query param required' });
    return;
  }

  const result = await db
    .select()
    .from(proShopOrders)
    .where(eq(proShopOrders.member_id, member_id))
    .orderBy(desc(proShopOrders.created_at));
  res.json(result);
});

interface CsrBody {
  venue_id: string;
  member_id: string;
  amount_credits: number;
  cause: string;
}

router.post('/csr', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, member_id, amount_credits, cause } = req.body as CsrBody;

  if (!venue_id || !member_id || !amount_credits || !cause) {
    res.status(400).json({ error: 'venue_id, member_id, amount_credits, and cause are required' });
    return;
  }

  if (amount_credits <= 0) {
    res.status(400).json({ error: 'amount_credits must be positive' });
    return;
  }

  const [member] = await db.select().from(members).where(eq(members.id, member_id));
  if (!member) {
    res.status(404).json({ error: 'Member not found' });
    return;
  }

  const balance = Number(member.credit_balance);
  if (balance < amount_credits) {
    res.status(400).json({ error: 'Insufficient credits', balance, required: amount_credits });
    return;
  }

  await db
    .update(members)
    .set({ credit_balance: String(balance - amount_credits) })
    .where(eq(members.id, member_id));

  const [contribution] = await db
    .insert(csrContributions)
    .values({
      venue_id,
      member_id,
      amount_credits: String(amount_credits),
      cause,
    })
    .returning();

  res.status(201).json(contribution);
});

export default router;
