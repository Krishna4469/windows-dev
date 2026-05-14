import { useState, useEffect } from 'react';

const BG     = '#0D0D11';
const CARD   = '#18181F';
const BORDER = '#2a2a38';
const WHITE  = '#FFFFFF';
const GRAY   = '#6B7280';
const MUTED  = '#9CA3AF';
const GREEN  = '#4ADE80';
const AMBER  = '#F59E0B';
const RED    = '#F87171';

type Tab = 'housekeeping' | 'valet' | 'kitchen';

interface HousekeepingTask {
  id: string;
  venue_id: string;
  room_id: string | null;
  task_type: string;
  status: string;
  assigned_to: string | null;
  scheduled_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

interface ValetRequest {
  id: string;
  venue_id: string;
  member_id: string;
  vehicle_number: string;
  status: string;
  parking_slot: string | null;
  requested_at: string;
  collected_at: string | null;
}

interface KitchenOrderItem {
  name: string;
  qty: number;
}

interface KitchenOrder {
  id: string;
  venue_id: string;
  order_type: string;
  items: unknown;
  status: string;
  table_number: string | null;
  member_id: string | null;
  total_credits: string;
  created_at: string;
  ready_at: string | null;
}

const TASK_ICONS: Record<string, string> = {
  cleaning:    '🧹',
  sanitising:  '🧴',
  restocking:  '📦',
  inspection:  '🔍',
};

const ORDER_TYPE_LABELS: Record<string, string> = {
  'dine-in':   'Dine-in',
  'takeaway':  'Takeaway',
  'pre-order': 'Pre-order',
};

const VALET_STEPS = ['requested', 'parked', 'ready', 'collected'] as const;

function taskStatusColor(status: string): string {
  if (status === 'in-progress') return AMBER;
  if (status === 'completed')   return GREEN;
  if (status === 'skipped')     return MUTED;
  return GRAY;
}

function orderStatusColor(status: string): string {
  if (status === 'preparing') return AMBER;
  if (status === 'ready')     return GREEN;
  if (status === 'delivered') return MUTED;
  return GRAY;
}

function StatusChip({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      background: color + '22',
      color,
      border: `1px solid ${color}55`,
      borderRadius: 999,
      padding: '2px 8px',
      fontSize: 11,
      fontWeight: 600,
      textTransform: 'capitalize',
    }}>
      {label.replace('-', ' ')}
    </span>
  );
}

function elapsed(ts: string): string {
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

function ActionBtn({
  label, color, onClick,
}: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color + '22',
        color,
        border: `1px solid ${color}55`,
        borderRadius: 8,
        padding: '4px 12px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

function ValetTimeline({ status }: { status: string }) {
  const currentIdx = VALET_STEPS.indexOf(status as typeof VALET_STEPS[number]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 6 }}>
      {VALET_STEPS.map((step, i) => (
        <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: i <= currentIdx ? AMBER : BORDER,
            border: i === currentIdx ? `2px solid ${AMBER}` : 'none',
          }} />
          {i < VALET_STEPS.length - 1 && (
            <div style={{
              width: 22, height: 2,
              background: i < currentIdx ? AMBER : BORDER,
            }} />
          )}
        </div>
      ))}
      <span style={{ color: AMBER, fontSize: 10, marginLeft: 6, textTransform: 'capitalize', fontWeight: 600 }}>
        {status}
      </span>
    </div>
  );
}

function HousekeepingTab({
  date,
  tasks,
  onUpdate,
}: {
  date: string;
  tasks: HousekeepingTask[];
  onUpdate: () => void;
}) {
  async function patch(id: string, body: Record<string, string>) {
    await fetch(`/api/ops/housekeeping/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    onUpdate();
  }

  const grouped: Record<string, HousekeepingTask[]> = {};
  for (const t of tasks) {
    const key = t.room_id ?? '__general__';
    grouped[key] = [...(grouped[key] ?? []), t];
  }

  const isOverdue = (t: HousekeepingTask) =>
    t.status === 'pending' && new Date(t.scheduled_at) < new Date();

  if (tasks.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>
        No tasks for {date}.
      </div>
    );
  }

  return (
    <>
      {Object.entries(grouped).map(([roomKey, roomTasks]) => (
        <div key={roomKey} style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 10, color: GRAY, letterSpacing: 1.2,
            textTransform: 'uppercase', marginBottom: 8,
          }}>
            {roomKey === '__general__'
              ? 'General'
              : `Room · ${roomKey.slice(0, 8)}…`}
            {' '}({roomTasks.length})
          </div>
          {roomTasks.map((t) => {
            const overdue = isOverdue(t);
            return (
              <div key={t.id} style={{
                background: CARD,
                border: `1px solid ${overdue ? RED + '55' : BORDER}`,
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 10,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ fontSize: 20, lineHeight: 1 }}>
                    {TASK_ICONS[t.task_type] ?? '🔧'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <span style={{
                        fontWeight: 600, color: overdue ? RED : WHITE,
                        fontSize: 14, textTransform: 'capitalize',
                      }}>
                        {t.task_type}
                      </span>
                      <StatusChip label={t.status} color={taskStatusColor(t.status)} />
                    </div>
                    <div style={{ color: GRAY, fontSize: 11, marginTop: 3 }}>
                      {new Date(t.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {overdue && (
                        <span style={{ color: RED, fontWeight: 700, marginLeft: 6 }}>· OVERDUE</span>
                      )}
                    </div>
                    {t.notes && (
                      <div style={{ color: MUTED, fontSize: 11, marginTop: 3 }}>{t.notes}</div>
                    )}
                    {(t.status === 'pending' || t.status === 'in-progress') && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                        {t.status === 'pending' && (
                          <ActionBtn
                            label="Start"
                            color={AMBER}
                            onClick={() => { void patch(t.id, { status: 'in-progress' }); }}
                          />
                        )}
                        {t.status === 'in-progress' && (
                          <ActionBtn
                            label="Complete"
                            color={GREEN}
                            onClick={() => { void patch(t.id, { status: 'completed' }); }}
                          />
                        )}
                        <ActionBtn
                          label="Skip"
                          color={GRAY}
                          onClick={() => { void patch(t.id, { status: 'skipped' }); }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}

function ValetTab({
  valets,
  onUpdate,
}: { valets: ValetRequest[]; onUpdate: () => void }) {
  async function patch(id: string, body: Record<string, string>) {
    await fetch(`/api/ops/valet/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    onUpdate();
  }

  if (valets.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>
        No active valet requests.
      </div>
    );
  }

  return (
    <>
      {valets.map((v) => (
        <div key={v.id} style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: '14px',
          marginBottom: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: WHITE, letterSpacing: 1 }}>
                {v.vehicle_number}
              </div>
              <div style={{ color: GRAY, fontSize: 11, marginTop: 2 }}>
                {elapsed(v.requested_at)}
              </div>
            </div>
            {v.parking_slot && (
              <div style={{
                background: AMBER + '22',
                border: `1px solid ${AMBER}55`,
                borderRadius: 8,
                padding: '4px 10px',
                textAlign: 'center',
              }}>
                <div style={{ color: GRAY, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 }}>Slot</div>
                <div style={{ color: AMBER, fontWeight: 800, fontSize: 15 }}>{v.parking_slot}</div>
              </div>
            )}
          </div>

          <ValetTimeline status={v.status} />

          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {v.status === 'requested' && (
              <ActionBtn
                label="Mark Parked"
                color={AMBER}
                onClick={() => { void patch(v.id, { status: 'parked' }); }}
              />
            )}
            {v.status === 'parked' && (
              <ActionBtn
                label="Notify Ready"
                color={GREEN}
                onClick={() => { void patch(v.id, { status: 'ready' }); }}
              />
            )}
            {v.status === 'ready' && (
              <ActionBtn
                label="Collected"
                color={MUTED}
                onClick={() => { void patch(v.id, { status: 'collected' }); }}
              />
            )}
          </div>
        </div>
      ))}
    </>
  );
}

function KitchenTab({
  orders,
  onUpdate,
}: { orders: KitchenOrder[]; onUpdate: () => void }) {
  async function patch(id: string, body: Record<string, string>) {
    await fetch(`/api/ops/kitchen/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    onUpdate();
  }

  function elapsedMins(ts: string): number {
    return Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
  }

  if (orders.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>
        No active kitchen orders.
      </div>
    );
  }

  return (
    <>
      {orders.map((o) => {
        const mins   = elapsedMins(o.created_at);
        const isLate = mins > 20 && o.status !== 'ready';
        const items  = Array.isArray(o.items) ? (o.items as KitchenOrderItem[]) : [];

        return (
          <div key={o.id} style={{
            background: CARD,
            border: `1px solid ${isLate ? RED + '55' : BORDER}`,
            borderRadius: 12,
            padding: '14px',
            marginBottom: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    background: AMBER + '22',
                    color: AMBER,
                    border: `1px solid ${AMBER}55`,
                    borderRadius: 6,
                    padding: '1px 7px',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}>
                    {ORDER_TYPE_LABELS[o.order_type] ?? o.order_type}
                  </span>
                  {o.table_number && (
                    <span style={{ color: MUTED, fontSize: 13, fontWeight: 600 }}>
                      Table {o.table_number}
                    </span>
                  )}
                </div>
                <div style={{
                  color: isLate ? RED : GRAY,
                  fontSize: 11,
                  marginTop: 4,
                  fontWeight: isLate ? 700 : 400,
                }}>
                  {mins}m elapsed{isLate ? ' · LATE' : ''}
                </div>
              </div>
              <StatusChip label={o.status} color={orderStatusColor(o.status)} />
            </div>

            {items.length > 0 && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                {items.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between',
                    color: MUTED, fontSize: 12, marginBottom: 3,
                  }}>
                    <span>{item.name}</span>
                    <span style={{ color: GRAY }}>×{item.qty}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <span style={{ color: AMBER, fontWeight: 700, fontSize: 14 }}>
                {o.total_credits} cr
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                {o.status === 'pending' && (
                  <ActionBtn
                    label="Start Preparing"
                    color={AMBER}
                    onClick={() => { void patch(o.id, { status: 'preparing' }); }}
                  />
                )}
                {o.status === 'preparing' && (
                  <ActionBtn
                    label="Mark Ready"
                    color={GREEN}
                    onClick={() => { void patch(o.id, { status: 'ready' }); }}
                  />
                )}
                {o.status === 'ready' && (
                  <ActionBtn
                    label="Delivered"
                    color={MUTED}
                    onClick={() => { void patch(o.id, { status: 'delivered' }); }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export function OperationsDashboard({ venueId }: { venueId: string }) {
  const [tab, setTab]       = useState<Tab>('housekeeping');
  const [tasks, setTasks]   = useState<HousekeepingTask[]>([]);
  const [valets, setValets] = useState<ValetRequest[]>([]);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate]     = useState<string>(new Date().toISOString().slice(0, 10));

  async function loadAll(d: string) {
    setLoading(true);
    const [tRes, vRes, oRes] = await Promise.all([
      fetch(`/api/ops/housekeeping?venue_id=${venueId}&date=${d}`),
      fetch(`/api/ops/valet?venue_id=${venueId}`),
      fetch(`/api/ops/kitchen?venue_id=${venueId}`),
    ]);
    if (tRes.ok) setTasks(await tRes.json() as HousekeepingTask[]);
    if (vRes.ok) setValets(await vRes.json() as ValetRequest[]);
    if (oRes.ok) setOrders(await oRes.json() as KitchenOrder[]);
    setLoading(false);
  }

  useEffect(() => { void loadAll(date); }, [venueId, date]);

  const pendingTasks   = tasks.filter((t) => t.status === 'pending' || t.status === 'in-progress').length;
  const activeValets   = valets.length;
  const activeOrders   = orders.length;

  const TABS: { key: Tab; label: string }[] = [
    { key: 'housekeeping', label: 'Housekeeping' },
    { key: 'valet',        label: 'Valet' },
    { key: 'kitchen',      label: 'Kitchen' },
  ];

  return (
    <div style={{
      background: BG,
      minHeight: '100vh',
      color: WHITE,
      fontFamily: 'system-ui, sans-serif',
      maxWidth: 480,
      margin: '0 auto',
      padding: '0 0 80px',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ fontSize: 11, color: GRAY, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
          Venue Control
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>Operations</div>
      </div>

      {/* Summary bar */}
      <div style={{
        display: 'flex',
        gap: 0,
        margin: '16px 16px 0',
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        {[
          { count: pendingTasks, label: 'Pending Tasks',  color: AMBER },
          { count: activeValets, label: 'Active Valets',  color: '#60A5FA' },
          { count: activeOrders, label: 'Live Orders',    color: GREEN },
        ].map(({ count, label, color }, i) => (
          <div key={label} style={{
            flex: 1,
            textAlign: 'center',
            padding: '12px 4px',
            borderRight: i < 2 ? `1px solid ${BORDER}` : 'none',
          }}>
            <div style={{ fontSize: 26, fontWeight: 800, color }}>{count}</div>
            <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 10,
              border: 'none',
              background: tab === key ? AMBER : CARD,
              color: tab === key ? BG : MUTED,
              fontWeight: 700,
              fontSize: 12,
              cursor: 'pointer',
              letterSpacing: 0.2,
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Date picker — only visible on housekeeping tab */}
        {tab === 'housekeeping' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ color: GRAY, fontSize: 12 }}>Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                color: WHITE,
                padding: '4px 8px',
                fontSize: 13,
                outline: 'none',
              }}
            />
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>Loading…</div>
        ) : (
          <>
            {tab === 'housekeeping' && (
              <HousekeepingTab
                date={date}
                tasks={tasks}
                onUpdate={() => { void loadAll(date); }}
              />
            )}
            {tab === 'valet' && (
              <ValetTab
                valets={valets}
                onUpdate={() => { void loadAll(date); }}
              />
            )}
            {tab === 'kitchen' && (
              <KitchenTab
                orders={orders}
                onUpdate={() => { void loadAll(date); }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default OperationsDashboard;
