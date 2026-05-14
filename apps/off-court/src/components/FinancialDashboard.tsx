import { useState, useEffect } from 'react';
import { Link } from 'wouter';

const BG     = '#0D0D11';
const CARD   = '#18181F';
const MERLOT = '#9B2335';
const AMBER  = '#F59E0B';
const GREEN  = '#4ADE80';
const RED    = '#F87171';
const BORDER = '#2a2a38';
const WHITE  = '#FFFFFF';
const GRAY   = '#6B7280';
const MUTED  = '#9CA3AF';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MERLOT_SHADES = ['#9B2335','#B84458','#C73352','#D45B6E','#A83248','#8B1A2A'];
const EXP_COLORS    = ['#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#10B981'];

interface PnLData {
  revenue: Record<string, number>;
  expenses: Record<string, number>;
  netProfit: number;
}

interface GSTR3BData {
  fp: string;
  outward_taxable_supplies: { taxable_value: number; central_tax: number; state_tax: number; integrated_tax: number };
  tax_payable: { cgst: number; sgst: number; igst: number; total: number };
}

interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: string;
  total_gross_inr: string;
  total_deductions_inr: string;
  total_net_inr: string;
}

interface AttendanceSummary {
  present: number;
  absent: number;
  total: number;
}

type Tab = 'overview' | 'pnl' | 'gst' | 'payroll';

function fmt(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function fmtFull(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currentPeriod() {
  const d    = new Date();
  const m    = d.getMonth() + 1;
  const y    = d.getFullYear();
  const mm   = String(m).padStart(2, '0');
  const last = new Date(y, m, 0).getDate();
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}`, month: m, year: y };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function DonutChart({ data, colors, size = 120 }: { data: { label: string; value: number }[]; colors: string[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return <div style={{ width: size, height: size, borderRadius: '50%', background: BORDER }} />;
  }

  const r    = 40;
  const cx   = 60;
  const cy   = 60;
  const circ = 2 * Math.PI * r;

  let pctOffset = 0;
  const segments = data.map((d, i) => {
    const pct   = d.value / total;
    const dash  = pct * circ;
    const gap   = circ - dash;
    const rot   = pctOffset * 360 - 90;
    pctOffset  += pct;
    return { dash, gap, rot, color: colors[i % colors.length] };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      {segments.map((s, i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={16}
          strokeDasharray={`${s.dash} ${s.gap}`}
          style={{ transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${s.rot}deg)` }}
        />
      ))}
      <circle cx={cx} cy={cy} r={30} fill={CARD} />
    </svg>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewTab({ venueId }: { venueId: string }) {
  const [pnl, setPnl]           = useState<PnLData | null>(null);
  const [gstr3b, setGstr3b]     = useState<GSTR3BData | null>(null);
  const [deferred, setDeferred] = useState(0);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const { from, to, month, year } = currentPeriod();
    Promise.all([
      fetch(`/api/finance/pnl?venue_id=${venueId}&from=${from}&to=${to}`).then((r) => r.json() as Promise<PnLData>),
      fetch(`/api/finance/gst/gstr3b?venue_id=${venueId}&month=${month}&year=${year}`).then((r) => r.json() as Promise<GSTR3BData>),
      fetch(`/api/finance/deferred-credits?venue_id=${venueId}`).then((r) => r.json() as Promise<{ balance: number }>),
    ])
      .then(([p, g, d]) => { setPnl(p); setGstr3b(g); setDeferred(d.balance ?? 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [venueId]);

  if (loading) return <div style={{ color: MUTED, textAlign: 'center', padding: 40, fontSize: 13 }}>Loading…</div>;

  const totalRevenue  = pnl ? Object.values(pnl.revenue).reduce((s, v) => s + v, 0)  : 0;
  const totalExpenses = pnl ? Object.values(pnl.expenses).reduce((s, v) => s + v, 0) : 0;
  const netProfit     = pnl?.netProfit ?? 0;
  const gstDue        = gstr3b?.tax_payable.total ?? 0;

  const kpis = [
    { label: 'Revenue',    value: fmt(totalRevenue),         sub: 'This month', color: MERLOT       },
    { label: 'Expenses',   value: fmt(totalExpenses),        sub: 'This month', color: AMBER        },
    { label: 'Net Profit', value: fmt(Math.abs(netProfit)),  sub: netProfit >= 0 ? 'Profit' : 'Loss', color: netProfit >= 0 ? GREEN : RED },
    { label: 'GST Due',    value: fmt(gstDue),               sub: 'Liability',  color: '#A78BFA'    },
  ];

  const revEntries = pnl ? Object.entries(pnl.revenue).sort((a, b) => b[1] - a[1]).slice(0, 6) : [];
  const maxRev     = revEntries[0]?.[1] ?? 1;
  const expEntries = pnl ? Object.entries(pnl.expenses).sort((a, b) => b[1] - a[1]).slice(0, 6) : [];

  return (
    <div style={{ padding: 16 }}>
      {/* KPI 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {kpis.map((k) => (
          <div key={k.label} style={{ background: CARD, borderRadius: 12, padding: '14px 12px', border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 10, color: MUTED, fontWeight: 600, letterSpacing: 0.5, marginBottom: 4 }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: GRAY, marginTop: 2 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue bar chart */}
      <div style={{ background: CARD, borderRadius: 12, padding: 14, border: `1px solid ${BORDER}`, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: MERLOT, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>REVENUE BREAKDOWN</div>
        {revEntries.length === 0 ? (
          <div style={{ color: GRAY, fontSize: 12, textAlign: 'center', padding: '12px 0' }}>No revenue this month</div>
        ) : revEntries.map(([name, val], i) => (
          <div key={name} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: MUTED }}>{name}</span>
              <span style={{ fontSize: 11, color: WHITE, fontWeight: 600 }}>{fmt(val)}</span>
            </div>
            <div style={{ height: 6, background: BORDER, borderRadius: 3 }}>
              <div style={{ height: 6, borderRadius: 3, width: `${Math.round((val / maxRev) * 100)}%`, background: MERLOT_SHADES[i % MERLOT_SHADES.length] }} />
            </div>
          </div>
        ))}
      </div>

      {/* Expenses donut */}
      <div style={{ background: CARD, borderRadius: 12, padding: 14, border: `1px solid ${BORDER}`, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: AMBER, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>EXPENSES BREAKDOWN</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <DonutChart data={expEntries.map(([label, value]) => ({ label, value }))} colors={EXP_COLORS} />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            {expEntries.length === 0 ? (
              <div style={{ color: GRAY, fontSize: 12 }}>No expenses this month</div>
            ) : expEntries.map(([name, val], i) => (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: EXP_COLORS[i % EXP_COLORS.length], flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: MUTED, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                <span style={{ fontSize: 10, color: WHITE, fontWeight: 600 }}>{fmt(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deferred credits */}
      <div style={{ background: '#1a1020', borderRadius: 12, padding: 14, border: '1px solid #6D28D944' }}>
        <div style={{ fontSize: 11, color: '#A78BFA', fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>DEFERRED CREDITS</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: WHITE }}>₹{fmtFull(deferred)}</div>
        <div style={{ fontSize: 11, color: GRAY, marginTop: 2 }}>Member credit balance outstanding</div>
      </div>
    </div>
  );
}

// ─── P&L ─────────────────────────────────────────────────────────────────────

function PnLTab({ venueId }: { venueId: string }) {
  const { month: curM, year: curY } = currentPeriod();
  const [month, setMonth]   = useState(curM);
  const [year, setYear]     = useState(curY);
  const [pnl, setPnl]       = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  async function load() {
    const mm   = String(month).padStart(2, '0');
    const last = new Date(year, month, 0).getDate();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/pnl?venue_id=${venueId}&from=${year}-${mm}-01&to=${year}-${mm}-${String(last).padStart(2, '0')}`);
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      setPnl(await res.json() as PnLData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load P&L');
    } finally {
      setLoading(false);
    }
  }

  const totalRevenue  = pnl ? Object.values(pnl.revenue).reduce((s, v) => s + v, 0)  : 0;
  const totalExpenses = pnl ? Object.values(pnl.expenses).reduce((s, v) => s + v, 0) : 0;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          style={{ flex: 1, background: CARD, color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
        >
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          style={{ flex: 1, background: CARD, color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
        >
          {[curY - 1, curY, curY + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <button
          onClick={load}
          disabled={loading}
          style={{ background: MERLOT, color: WHITE, border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? 0.6 : 1 }}
        >
          {loading ? '…' : 'Load'}
        </button>
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {pnl && (
        <>
          <div style={{ background: CARD, borderRadius: 12, padding: 14, border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: MERLOT, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>REVENUE</div>
            {Object.entries(pnl.revenue).length === 0 ? (
              <div style={{ color: GRAY, fontSize: 12, textAlign: 'center', padding: '8px 0' }}>No revenue entries</div>
            ) : Object.entries(pnl.revenue).map(([name, val]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: MUTED }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: MERLOT }}>₹{fmtFull(val)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: BORDER, margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Total Revenue</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: MERLOT }}>₹{fmtFull(totalRevenue)}</span>
            </div>
          </div>

          <div style={{ background: CARD, borderRadius: 12, padding: 14, border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: AMBER, fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>EXPENSES</div>
            {Object.entries(pnl.expenses).length === 0 ? (
              <div style={{ color: GRAY, fontSize: 12, textAlign: 'center', padding: '8px 0' }}>No expense entries</div>
            ) : Object.entries(pnl.expenses).map(([name, val]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: MUTED }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: AMBER }}>₹{fmtFull(val)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: BORDER, margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Total Expenses</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: AMBER }}>₹{fmtFull(totalExpenses)}</span>
            </div>
          </div>

          <div style={{
            background: pnl.netProfit >= 0 ? '#0f2318' : '#2a1010',
            borderRadius: 12,
            padding: '16px 14px',
            border: `1px solid ${pnl.netProfit >= 0 ? '#4ADE8044' : '#F8717144'}`,
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Net {pnl.netProfit >= 0 ? 'Profit' : 'Loss'}</span>
            <span style={{ fontWeight: 700, fontSize: 20, color: pnl.netProfit >= 0 ? GREEN : RED }}>
              ₹{fmtFull(Math.abs(pnl.netProfit))}
            </span>
          </div>

          <button style={{
            width: '100%', background: 'transparent', color: MERLOT,
            border: `1px solid ${MERLOT}`, borderRadius: 10, padding: '12px 0',
            fontWeight: 700, fontSize: 14, cursor: 'default', opacity: 0.5,
          }}>
            Export to CSV (Coming Soon)
          </button>
        </>
      )}

      {!pnl && !loading && !error && (
        <div style={{ color: GRAY, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
          Select a period and tap Load
        </div>
      )}
    </div>
  );
}

// ─── GST ─────────────────────────────────────────────────────────────────────

function GSTTab({ venueId }: { venueId: string }) {
  const { month, year } = currentPeriod();
  const [data, setData]     = useState<GSTR3BData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/finance/gst/gstr3b?venue_id=${venueId}&month=${month}&year=${year}`)
      .then((r) => r.json() as Promise<GSTR3BData>)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [venueId, month, year]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>
        GSTR-3B · {MONTHS[month - 1]} {year}
      </div>

      {loading && <div style={{ color: MUTED, textAlign: 'center', padding: 32, fontSize: 13 }}>Loading…</div>}

      {data && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
            <span style={{
              background: '#1a1a10', color: AMBER,
              border: `1px solid ${AMBER}44`,
              borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700,
            }}>DRAFT</span>
          </div>

          <div style={{ background: CARD, borderRadius: 12, padding: 16, border: `1px solid ${BORDER}`, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: AMBER, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>OUTWARD SUPPLIES</div>
            {([
              ['Taxable Value', data.outward_taxable_supplies.taxable_value],
              ['CGST',          data.outward_taxable_supplies.central_tax],
              ['SGST',          data.outward_taxable_supplies.state_tax],
              ['IGST',          data.outward_taxable_supplies.integrated_tax],
            ] as [string, number][]).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: MUTED, fontSize: 13 }}>{label}</span>
                <span style={{ fontWeight: 600, fontSize: 13 }}>₹{fmtFull(val)}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#1a1a10', borderRadius: 12, padding: 16, border: `1px solid ${AMBER}44`, marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: AMBER, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>TOTAL GST LIABILITY</div>
            {([
              ['CGST', data.tax_payable.cgst],
              ['SGST', data.tax_payable.sgst],
              ['IGST', data.tax_payable.igst],
            ] as [string, number][]).map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: MUTED, fontSize: 13 }}>{label}</span>
                <span style={{ fontSize: 13 }}>₹{fmtFull(val)}</span>
              </div>
            ))}
            <div style={{ height: 1, background: BORDER, margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>Total Tax</span>
              <span style={{ fontWeight: 700, fontSize: 18, color: AMBER }}>₹{fmtFull(data.tax_payable.total)}</span>
            </div>
          </div>

          <Link href="/gst">
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: CARD, borderRadius: 10, padding: '12px 14px',
              border: `1px solid ${BORDER}`, cursor: 'pointer',
            }}>
              <span style={{ color: WHITE, fontSize: 13, fontWeight: 600 }}>Open Full GST Dashboard</span>
              <span style={{ color: AMBER, fontSize: 18 }}>›</span>
            </div>
          </Link>
        </>
      )}
    </div>
  );
}

// ─── Payroll ─────────────────────────────────────────────────────────────────

function PayrollTab({ venueId }: { venueId: string }) {
  const { month: curMonth, year: curYear } = currentPeriod();

  const [runs, setRuns]             = useState<PayrollRun[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading]       = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [runsRes, attRes] = await Promise.all([
        fetch(`/api/payroll/runs?venue_id=${venueId}`),
        fetch(`/api/payroll/attendance-summary?venue_id=${venueId}&date=${todayStr()}`),
      ]);
      if (runsRes.ok) setRuns(await runsRes.json() as PayrollRun[]);
      if (attRes.ok)  setAttendance(await attRes.json() as AttendanceSummary);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { void loadData(); }, [venueId]);

  const currentRun = runs.find((r) => r.month === curMonth && r.year === curYear);

  async function generatePayroll() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/payroll/runs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ venue_id: venueId, month: curMonth, year: curYear }),
      });
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate payroll');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>
        {MONTHS[curMonth - 1]} {curYear} payroll
      </div>

      {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {loading ? (
        <div style={{ color: MUTED, textAlign: 'center', padding: 32, fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          {currentRun ? (
            <div style={{ background: CARD, borderRadius: 12, padding: 16, border: `1px solid ${BORDER}`, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: AMBER, fontWeight: 700, letterSpacing: 1 }}>PAYROLL STATUS</div>
                <span style={{
                  background: currentRun.status === 'processed' ? '#0f2318' : '#1a1a10',
                  color: currentRun.status === 'processed' ? GREEN : AMBER,
                  border: `1px solid ${currentRun.status === 'processed' ? '#4ADE8044' : `${AMBER}44`}`,
                  borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
                }}>
                  {currentRun.status.toUpperCase()}
                </span>
              </div>
              {([
                ['Total Gross',  parseFloat(currentRun.total_gross_inr)],
                ['Deductions',   parseFloat(currentRun.total_deductions_inr)],
              ] as [string, number][]).map(([label, val]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: MUTED, fontSize: 13 }}>{label}</span>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>₹{fmtFull(val)}</span>
                </div>
              ))}
              <div style={{ height: 1, background: BORDER, margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Net Payable</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: GREEN }}>₹{fmtFull(parseFloat(currentRun.total_net_inr))}</span>
              </div>
            </div>
          ) : (
            <div style={{ background: CARD, borderRadius: 12, padding: 20, border: `1px solid ${BORDER}`, marginBottom: 14, textAlign: 'center' }}>
              <div style={{ color: GRAY, fontSize: 13, marginBottom: 14 }}>No payroll generated for this month</div>
              <button
                onClick={generatePayroll}
                disabled={generating}
                style={{
                  background: AMBER, color: '#000', border: 'none', borderRadius: 8,
                  padding: '10px 24px', fontWeight: 700, fontSize: 14,
                  cursor: generating ? 'default' : 'pointer', opacity: generating ? 0.6 : 1,
                }}
              >
                {generating ? 'Generating…' : 'Generate Payroll'}
              </button>
            </div>
          )}

          {currentRun && (
            <a href={`/api/payroll/runs/${currentRun.id}/bank-file`} download style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#1a1020', borderRadius: 10, padding: '12px 14px',
                border: '1px solid #6D28D944', marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
              }}>
                <span style={{ color: WHITE, fontSize: 13, fontWeight: 600 }}>Download Bank File (CSV)</span>
                <span style={{ color: '#A78BFA', fontSize: 18 }}>↓</span>
              </div>
            </a>
          )}

          <div style={{ background: CARD, borderRadius: 12, padding: 16, border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 11, color: AMBER, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>TODAY'S ATTENDANCE</div>
            {attendance ? (
              <div style={{ display: 'flex', gap: 10 }}>
                {([
                  ['Present', attendance.present, GREEN],
                  ['Absent',  attendance.absent,  RED  ],
                  ['Total',   attendance.total,   WHITE],
                ] as [string, number, string][]).map(([label, val, color]) => (
                  <div key={label} style={{ flex: 1, background: BG, borderRadius: 8, padding: '10px 0', textAlign: 'center', border: `1px solid ${BORDER}` }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color }}>{val}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: GRAY, fontSize: 13, textAlign: 'center', padding: '8px 0' }}>No attendance data for today</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface FinancialDashboardProps {
  venueId?: string;
}

export default function FinancialDashboard({ venueId = 'demo-venue' }: FinancialDashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const { month, year } = currentPeriod();

  const tabStyle = (t: Tab) => ({
    flex: 1,
    padding: '10px 0',
    background: tab === t ? MERLOT : CARD,
    color: tab === t ? WHITE : GRAY,
    border: 'none',
    fontWeight: 600,
    fontSize: 12,
    cursor: 'pointer',
    borderBottom: tab === t ? `2px solid ${MERLOT}` : `2px solid ${BORDER}`,
  });

  return (
    <div style={{ background: BG, minHeight: '100vh', color: WHITE, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 11, color: MERLOT, fontWeight: 700, letterSpacing: 1 }}>FINANCIAL HQ</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>Finance Dashboard</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{MONTHS[month - 1]} {year} · Karnataka</div>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
        <button style={tabStyle('overview')} onClick={() => setTab('overview')}>Overview</button>
        <button style={tabStyle('pnl')}      onClick={() => setTab('pnl')}>P&amp;L</button>
        <button style={tabStyle('gst')}      onClick={() => setTab('gst')}>GST</button>
        <button style={tabStyle('payroll')}  onClick={() => setTab('payroll')}>Payroll</button>
      </div>

      {tab === 'overview' && <OverviewTab venueId={venueId} />}
      {tab === 'pnl'      && <PnLTab      venueId={venueId} />}
      {tab === 'gst'      && <GSTTab      venueId={venueId} />}
      {tab === 'payroll'  && <PayrollTab  venueId={venueId} />}
    </div>
  );
}
