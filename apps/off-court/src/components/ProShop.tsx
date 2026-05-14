import { useState, useEffect } from 'react';

type CategoryFilter = 'all' | 'racket' | 'shoes' | 'apparel' | 'accessories' | 'balls' | 'grips';

interface ProShopItem {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  category: string;
  brand: string;
  price_credits: string;
  price_inr: string;
  stock_quantity: number;
  image_url: string | null;
  status: string;
  created_at: string;
}

interface ProShopOrder {
  id: string;
  item_id: string;
  quantity: number;
  credits_charged: string;
  status: string;
  created_at: string;
}

interface CsrContribution {
  id: string;
  amount_credits: string;
  cause: string;
  contributed_at: string;
}

const DEMO_MEMBER_ID = 'placeholder-member-id';
const DEMO_VENUE_ID = 'placeholder-venue-id';

type ActiveTab = 'shop' | 'give-back';

const CATEGORIES: CategoryFilter[] = ['all', 'racket', 'shoes', 'apparel', 'accessories', 'balls', 'grips'];

const CATEGORY_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  racket:      { label: 'Racket',      bg: '#2A1A1A', text: '#FCA5A5' },
  shoes:       { label: 'Shoes',       bg: '#1A1E2A', text: '#93C5FD' },
  apparel:     { label: 'Apparel',     bg: '#1E2A1E', text: '#86EFAC' },
  accessories: { label: 'Accessories', bg: '#2A201A', text: '#FDBA74' },
  balls:       { label: 'Balls',       bg: '#1E2A2A', text: '#5EEAD4' },
  grips:       { label: 'Grips',       bg: '#2A1A2E', text: '#C084FC' },
};

const CSR_CAUSES = [
  {
    key: 'court_access',
    label: 'Court Access for Underprivileged Kids',
    description: 'Sponsor free court time for local youth programs.',
  },
  {
    key: 'local_sports',
    label: 'Local Sports Development',
    description: 'Fund grassroots tournaments and coaching for community athletes.',
  },
  {
    key: 'green_court',
    label: 'Green Court Initiative',
    description: 'Support sustainable court maintenance and solar energy projects.',
  },
];

function CategoryBadge({ category }: { category: string }) {
  const cfg = CATEGORY_CONFIG[category] ?? { label: category, bg: '#1F2937', text: '#9CA3AF' };
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
      style={{ backgroundColor: cfg.bg, color: cfg.text }}
    >
      {cfg.label}
    </span>
  );
}

function StockBadge({ qty }: { qty: number }) {
  if (qty === 0) return <span className="text-xs font-medium" style={{ color: '#EF4444' }}>Out of stock</span>;
  if (qty <= 3) return <span className="text-xs font-medium" style={{ color: '#F59E0B' }}>Low stock ({qty})</span>;
  return <span className="text-xs font-medium" style={{ color: '#4ADE80' }}>In stock</span>;
}

export function ProShop() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('shop');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [items, setItems] = useState<ProShopItem[]>([]);
  const [orders, setOrders] = useState<ProShopOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [csrAmounts, setCsrAmounts] = useState<Record<string, string>>({});
  const [contributions, setContributions] = useState<CsrContribution[]>([]);
  const [csrActing, setCsrActing] = useState<string | null>(null);

  const loadItems = (category: CategoryFilter): void => {
    setLoading(true);
    const url = category === 'all' ? '/api/proshop/items' : `/api/proshop/items?category=${category}`;
    fetch(url)
      .then((r) => r.json() as Promise<ProShopItem[]>)
      .then((data) => { setItems(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const loadOrders = (): void => {
    fetch(`/api/proshop/orders?member_id=${DEMO_MEMBER_ID}`)
      .then((r) => r.json() as Promise<ProShopOrder[]>)
      .then(setOrders)
      .catch(console.error);
  };

  useEffect(() => {
    if (activeTab === 'shop') {
      loadItems(categoryFilter);
      loadOrders();
    }
  }, [activeTab, categoryFilter]);

  const handleBuy = (item: ProShopItem): void => {
    if (item.stock_quantity === 0) return;
    setActing(item.id);
    fetch('/api/proshop/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id: DEMO_VENUE_ID,
        member_id: DEMO_MEMBER_ID,
        item_id: item.id,
        quantity: 1,
      }),
    })
      .then((r) => {
        if (r.ok) {
          alert(`Purchased ${item.name}!`);
          loadItems(categoryFilter);
          loadOrders();
          return;
        }
        return r.json().then((err: { error: string }) => alert(err.error));
      })
      .catch(console.error)
      .finally(() => setActing(null));
  };

  const handleContribute = (causeKey: string, causeLabel: string): void => {
    const amountStr = csrAmounts[causeKey];
    const amount = Number(amountStr);
    if (!amountStr || isNaN(amount) || amount <= 0) {
      alert('Enter a valid credit amount');
      return;
    }
    setCsrActing(causeKey);
    fetch('/api/proshop/csr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        venue_id: DEMO_VENUE_ID,
        member_id: DEMO_MEMBER_ID,
        amount_credits: amount,
        cause: causeLabel,
      }),
    })
      .then((r) => {
        if (r.ok) {
          alert(`Contributed ${amount} credits to ${causeLabel}!`);
          setCsrAmounts((prev) => ({ ...prev, [causeKey]: '' }));
          return r.json() as Promise<CsrContribution>;
        }
        return r.json().then((err: { error: string }) => { alert(err.error); return null; });
      })
      .then((contrib) => {
        if (contrib) setContributions((prev) => [contrib, ...prev]);
      })
      .catch(console.error)
      .finally(() => setCsrActing(null));
  };

  const totalContributed = contributions.reduce((sum, c) => sum + Number(c.amount_credits), 0);

  return (
    <div className="min-h-full px-4 py-6" style={{ backgroundColor: '#111118' }}>
      <h1 className="mb-1 text-xl font-semibold text-white">Pro Shop</h1>
      <p className="mb-5 text-xs" style={{ color: '#9CA3AF' }}>Gear up. Give back.</p>

      {/* Tabs */}
      <div className="mb-5 flex gap-1 rounded-xl p-1" style={{ backgroundColor: '#1C1C26' }}>
        {(['shop', 'give-back'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 rounded-lg py-2 text-sm font-medium transition-colors"
            style={
              activeTab === tab
                ? { backgroundColor: '#722F37', color: '#FFFFFF' }
                : { color: '#6B7280' }
            }
          >
            {tab === 'shop' ? 'Shop' : 'Give Back'}
          </button>
        ))}
      </div>

      {activeTab === 'shop' ? (
        <>
          {/* Category filter chips */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="shrink-0 rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors"
                style={
                  categoryFilter === cat
                    ? { backgroundColor: '#722F37', color: '#FFFFFF' }
                    : { backgroundColor: '#1C1C26', color: '#6B7280' }
                }
              >
                {cat}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <p className="text-sm" style={{ color: '#6B7280' }}>Loading...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="mt-24 flex flex-col items-center gap-2">
              <p className="text-3xl">🎾</p>
              <p className="text-sm" style={{ color: '#6B7280' }}>No items available.</p>
              <p className="text-xs" style={{ color: '#4B5563' }}>Check back soon.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => {
                const isActing = acting === item.id;
                const outOfStock = item.stock_quantity === 0;
                const credits = Number(item.price_credits);
                return (
                  <li key={item.id} className="rounded-xl p-4" style={{ backgroundColor: '#18181F' }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <CategoryBadge category={item.category} />
                          <StockBadge qty={item.stock_quantity} />
                        </div>
                        <p className="font-semibold text-white leading-tight">{item.name}</p>
                        <p className="mt-0.5 text-xs" style={{ color: '#9CA3AF' }}>{item.brand}</p>
                        {item.description && (
                          <p className="mt-1 text-xs line-clamp-2" style={{ color: '#6B7280' }}>{item.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-base font-semibold" style={{ color: '#E9B4BD' }}>{credits} credits</span>
                          <span className="text-xs" style={{ color: '#4B5563' }}>₹{Number(item.price_inr).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleBuy(item)}
                        disabled={isActing || outOfStock}
                        className="shrink-0 rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-40"
                        style={{ backgroundColor: '#722F37', color: '#FFFFFF' }}
                      >
                        {isActing ? '...' : outOfStock ? 'Sold Out' : 'Buy'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {orders.length > 0 && (
            <div className="mt-6">
              <p className="mb-3 text-sm font-semibold" style={{ color: '#9CA3AF' }}>Your Orders</p>
              <ul className="flex flex-col gap-2">
                {orders.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ backgroundColor: '#18181F' }}
                  >
                    <div className="text-xs" style={{ color: '#9CA3AF' }}>
                      <span>Qty {o.quantity}</span>
                      <span className="ml-2" style={{ color: '#E9B4BD' }}>{Number(o.credits_charged)} cr</span>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-medium capitalize"
                      style={{
                        backgroundColor: o.status === 'completed' ? '#052E16' : '#1C1C26',
                        color: o.status === 'completed' ? '#4ADE80' : '#9CA3AF',
                      }}
                    >
                      {o.status}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          {totalContributed > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: '#18181F' }}>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>Total contributed this session</p>
              <p className="text-2xl font-bold" style={{ color: '#4ADE80' }}>{totalContributed} credits</p>
            </div>
          )}

          {CSR_CAUSES.map((cause) => {
            const isActing = csrActing === cause.key;
            return (
              <div key={cause.key} className="rounded-xl p-4" style={{ backgroundColor: '#18181F' }}>
                <p className="font-semibold text-white leading-tight">{cause.label}</p>
                <p className="mt-1 text-xs" style={{ color: '#6B7280' }}>{cause.description}</p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="Credits"
                    value={csrAmounts[cause.key] ?? ''}
                    onChange={(e) =>
                      setCsrAmounts((prev) => ({ ...prev, [cause.key]: e.target.value }))
                    }
                    className="flex-1 rounded-lg px-3 py-2 text-sm text-white outline-none"
                    style={{ backgroundColor: '#1C1C26', border: '1px solid #2D2D3A' }}
                  />
                  <button
                    onClick={() => handleContribute(cause.key, cause.label)}
                    disabled={isActing}
                    className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-40"
                    style={{ backgroundColor: '#722F37', color: '#FFFFFF' }}
                  >
                    {isActing ? '...' : 'Contribute'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
