import { useState, useEffect, useCallback } from 'react';

const BG     = '#0D0D11';
const CARD   = '#18181F';
const BORDER = '#2a2a38';
const WHITE  = '#FFFFFF';
const GRAY   = '#6B7280';
const MUTED  = '#9CA3AF';
const GOLD   = '#F59E0B';
const GREEN  = '#22C55E';
const RED    = '#EF4444';

const MONTHS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTHS_FULL = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmt(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function fmtFull(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`;
}

// ── Util Gauge (semicircle arc) ──────────────────────────────────────────────
function UtilGauge({ pct }: { pct: number }) {
  const color = pct >= 75 ? GREEN : pct >= 50 ? GOLD : RED;
  const r  = 44;
  const cx = 55;
  const cy = 52;

  // Arc endpoint at pct%: angle from left (π) sweeping counterclockwise through top
  const theta = Math.PI * (1 - pct / 100);
  const ex = cx + r * Math.cos(theta);
  const ey = cy - r * Math.sin(theta);
  const large = pct > 50 ? 1 : 0;

  return (
    <svg viewBox="0 0 110 60" width="110" height="60" aria-label={`Court utilisation ${pct}%`}>
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
        fill="none"
        stroke={BORDER}
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Fill */}
      {pct > 0 && (
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 ${large} 0 ${ex.toFixed(2)} ${ey.toFixed(2)}`}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
        />
      )}
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize="15" fontWeight="bold">
        {pct}%
      </text>
      <text x={cx} y={cy + 8} textAnchor="middle" fill={GRAY} fontSize="7">
        UTILISATION
      </text>
    </svg>
  );
}

// ── Member Growth Bar ────────────────────────────────────────────────────────
function MemberGrowthBar({
  currentTotal,
  prevTotal,
  newThisMonth,
}: {
  currentTotal: number;
  prevTotal: number;
  newThisMonth: number;
}) {
  const maxVal = Math.max(currentTotal, prevTotal, 1);
  const prevW  = (prevTotal    / maxVal) * 100;
  const currW  = (currentTotal / maxVal) * 100;

  return (
    <div style={{ padding: '10px 0 4px' }}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Previous Month
          </span>
          <span style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>{prevTotal}</span>
        </div>
        <div style={{ height: 6, background: BORDER, borderRadius: 99 }}>
          <div style={{ height: '100%', width: `${prevW}%`, background: BORDER, borderRadius: 99, border: `1px solid ${GRAY}` }} />
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span style={{ fontSize: 9, color: GOLD, textTransform: 'uppercase', letterSpacing: 0.6 }}>
            This Month
          </span>
          <span style={{ fontSize: 10, color: GOLD, fontWeight: 700 }}>{currentTotal}</span>
        </div>
        <div style={{ height: 6, background: BORDER, borderRadius: 99 }}>
          <div style={{ height: '100%', width: `${currW}%`, background: GOLD, borderRadius: 99 }} />
        </div>
      </div>
      {newThisMonth > 0 && (
        <div style={{ marginTop: 8, fontSize: 10, color: GREEN }}>
          +{newThisMonth} new members this month
        </div>
      )}
    </div>
  );
}

// ── Payback Curve SVG ────────────────────────────────────────────────────────
interface EbitdaPoint { month: number; ebitda: number; cumulative: number; }

function PaybackCurve({
  data,
  setupCost,
  paybackMonth,
}: {
  data: EbitdaPoint[];
  setupCost: number;
  paybackMonth: number;
}) {
  const W = 280;
  const H = 120;
  const padL = 36; const padR = 10; const padT = 10; const padB = 24;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const minCum = Math.min(0, ...data.map((d) => d.cumulative));
  const maxCum = Math.max(setupCost * 1.1, ...data.map((d) => d.cumulative));
  const yRange = maxCum - minCum;

  function px(month: number): number {
    return padL + ((month - 1) / 35) * plotW;
  }
  function py(val: number): number {
    return padT + plotH - ((val - minCum) / yRange) * plotH;
  }

  const points = data.map((d) => `${px(d.month).toFixed(1)},${py(d.cumulative).toFixed(1)}`).join(' ');
  const zeroY     = py(0);
  const setupY    = py(setupCost);
  const paybackX  = px(paybackMonth);

  const xTicks = [1, 6, 12, 18, 24, 28, 36];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: 'block', maxHeight: H }}
      aria-label="Payback curve"
    >
      {/* Zero line */}
      <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke={GRAY} strokeWidth="0.5" strokeDasharray="3,3" />
      {/* Break-even line at setup cost */}
      <line x1={padL} y1={setupY} x2={W - padR} y2={setupY} stroke={GOLD} strokeWidth="0.8" strokeDasharray="4,3" />
      <text x={padL + 2} y={setupY - 2} fill={GOLD} fontSize="6">85L target</text>

      {/* Payback vertical */}
      <line x1={paybackX} y1={padT} x2={paybackX} y2={H - padB} stroke={GREEN} strokeWidth="0.8" strokeDasharray="3,3" />
      <text x={paybackX + 2} y={padT + 8} fill={GREEN} fontSize="6">M{paybackMonth}</text>

      {/* Cumulative curve */}
      <polyline
        points={points}
        fill="none"
        stroke={GOLD}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* X-axis */}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke={BORDER} strokeWidth="0.5" />
      {xTicks.map((m) => (
        <g key={m}>
          <line x1={px(m)} y1={H - padB} x2={px(m)} y2={H - padB + 3} stroke={GRAY} strokeWidth="0.5" />
          <text x={px(m)} y={H - padB + 9} textAnchor="middle" fill={GRAY} fontSize="6">{m}</text>
        </g>
      ))}

      {/* Y-axis ticks */}
      {[0, setupCost / 2, setupCost].map((v, i) => (
        <text key={i} x={padL - 2} y={py(v) + 3} textAnchor="end" fill={GRAY} fontSize="5.5">
          {v === 0 ? '0' : `${(v / 100000).toFixed(0)}L`}
        </text>
      ))}

      <text x={padL + plotW / 2} y={H - 2} textAnchor="middle" fill={GRAY} fontSize="6">
        Months
      </text>
    </svg>
  );
}

// ── Expandable Section Card ──────────────────────────────────────────────────
function Section({
  id,
  title,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => onToggle(id)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '14px 16px',
          cursor: 'pointer',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>{title}</span>
        <span style={{ fontSize: 16, color: GOLD }}>{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${BORDER}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Interfaces ───────────────────────────────────────────────────────────────
interface InvestorReportData {
  venue_id: string;
  period: { month: number; year: number; from_date: string; to_date: string };
  financial_performance: {
    revenue: Record<string, number>;
    total_revenue: number;
    expenses: Record<string, number>;
    total_expenses: number;
    net_profit: number;
  };
  member_metrics: {
    total_members: number;
    new_this_month: number;
    churn_count: number;
    active_members: number;
  };
  operational_kpis: {
    court_utilisation_pct: number;
    payroll_total: number;
  };
  compliance_status: {
    gst_liability: { cgst: number; sgst: number; igst: number; total: number };
  };
  top_revenue_sources: Array<{ source: string; amount: number }>;
  generated_at: string;
}

interface InvestmentModel {
  venue_id: string;
  total_setup_cost_inr: number;
  payback_months: number;
  irr_pct: number;
  setup_costs: Array<{ item: string; amount_inr: number }>;
  monthly_ebitda: EbitdaPoint[];
}

// ── Text formatter (frontend) ────────────────────────────────────────────────
function toText(r: InvestorReportData): string {
  const { period: p, financial_performance: f, member_metrics: m,
          operational_kpis: o, compliance_status: c, top_revenue_sources: t } = r;
  const lines: string[] = [];
  lines.push(`INVESTOR REPORT — ${MONTHS_FULL[p.month]} ${p.year}`);
  lines.push(`Period: ${p.from_date} to ${p.to_date}`);
  lines.push('');
  lines.push('═══ FINANCIAL PERFORMANCE ═══');
  for (const [src, amt] of Object.entries(f.revenue))  lines.push(`  Revenue  — ${src}: ${fmtFull(amt)}`);
  lines.push(`  Total Revenue:    ${fmtFull(f.total_revenue)}`);
  for (const [cat, amt] of Object.entries(f.expenses)) lines.push(`  Expense  — ${cat}: ${fmtFull(amt)}`);
  lines.push(`  Total Expenses:   ${fmtFull(f.total_expenses)}`);
  lines.push(`  Net Profit:       ${fmtFull(f.net_profit)}`);
  lines.push('');
  lines.push('═══ MEMBER METRICS ═══');
  lines.push(`  Total Members:    ${m.total_members}`);
  lines.push(`  Active Members:   ${m.active_members}`);
  lines.push(`  New This Month:   ${m.new_this_month}`);
  lines.push(`  Churn Count:      ${m.churn_count}`);
  lines.push('');
  lines.push('═══ OPERATIONAL KPIs ═══');
  lines.push(`  Court Utilisation: ${o.court_utilisation_pct}%`);
  lines.push(`  Payroll Total:     ${fmtFull(o.payroll_total)}`);
  lines.push('');
  lines.push('═══ COMPLIANCE STATUS ═══');
  lines.push(`  GST — CGST:  ${fmtFull(c.gst_liability.cgst)}`);
  lines.push(`  GST — SGST:  ${fmtFull(c.gst_liability.sgst)}`);
  lines.push(`  GST — IGST:  ${fmtFull(c.gst_liability.igst)}`);
  lines.push(`  GST Total:   ${fmtFull(c.gst_liability.total)}`);
  if (t.length > 0) {
    lines.push('');
    lines.push('═══ TOP REVENUE SOURCES ═══');
    t.forEach((s, i) => lines.push(`  #${i + 1} ${s.source}: ${fmtFull(s.amount)}`));
  }
  lines.push('');
  lines.push(`Generated: ${r.generated_at}`);
  return lines.join('\n');
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── GST Traffic Light ────────────────────────────────────────────────────────
function GstTrafficLight({ total }: { total: number }) {
  const color = total === 0 ? GREEN : GOLD;
  const label = total === 0 ? 'No liability' : 'Liability outstanding';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
      <div style={{
        width: 14, height: 14, borderRadius: '50%',
        background: color, boxShadow: `0 0 8px ${color}88`,
      }} />
      <span style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function InvestorReport({ venueId }: { venueId: string }) {
  const now  = new Date();
  const [tab, setTab]       = useState<'report' | 'model'>('report');
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [year, setYear]     = useState(now.getFullYear());
  const [report, setReport] = useState<InvestorReportData | null>(null);
  const [model, setModel]   = useState<InvestmentModel | null>(null);
  const [loading, setLoading]     = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [expanded, setExpanded]   = useState<Set<string>>(new Set(['financial']));
  const [error, setError]   = useState<string | null>(null);

  function toggleSection(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/franchise/venues/${venueId}/investor-report?month=${month}&year=${year}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReport(await res.json() as InvestorReportData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setLoading(false);
    }
  }, [venueId, month, year]);

  const loadModel = useCallback(async () => {
    if (model) return;
    setModelLoading(true);
    try {
      const res = await fetch(`/api/franchise/venues/${venueId}/investment-model`);
      if (res.ok) setModel(await res.json() as InvestmentModel);
    } finally {
      setModelLoading(false);
    }
  }, [venueId, model]);

  useEffect(() => {
    if (tab === 'model') void loadModel();
  }, [tab, loadModel]);

  const fin   = report?.financial_performance;
  const mem   = report?.member_metrics;
  const ops   = report?.operational_kpis;
  const comp  = report?.compliance_status;
  const topSrc = report?.top_revenue_sources ?? [];

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i);

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
          Off-Court
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>
          <span style={{ color: GOLD }}>◆</span> Investor Report
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, margin: '16px 16px 0', borderRadius: 10, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
        {(['report', 'model'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              background: tab === t ? GOLD : 'transparent',
              color: tab === t ? '#000' : MUTED,
              border: 'none',
              padding: '10px 0',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            {t === 'report' ? 'Report' : 'Investment Model'}
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 16px 0' }}>

        {/* ── Report Tab ── */}
        {tab === 'report' && (
          <>
            {/* Period Selector */}
            <div style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                Report Period
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  style={{
                    flex: 1,
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    color: WHITE,
                    padding: '8px 10px',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {MONTHS.slice(1).map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  style={{
                    flex: 1,
                    background: BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 8,
                    color: WHITE,
                    padding: '8px 10px',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <button
                  onClick={() => void generateReport()}
                  disabled={loading}
                  style={{
                    background: loading ? GOLD + '66' : GOLD,
                    color: '#000',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 16px',
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: loading ? 'wait' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {loading ? '…' : 'Generate'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#EF444422',
                border: `1px solid #EF444455`,
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 14,
                fontSize: 12,
                color: '#EF4444',
              }}>
                {error}
              </div>
            )}

            {!report && !loading && (
              <div style={{ textAlign: 'center', color: MUTED, padding: '40px 0', fontSize: 13 }}>
                Select a period and tap Generate
              </div>
            )}

            {report && (
              <>
                {/* Financial Performance */}
                <Section id="financial" title="Financial Performance" expanded={expanded.has('financial')} onToggle={toggleSection}>
                  <div style={{ marginTop: 12 }}>
                    {/* Revenue breakdown */}
                    {Object.keys(fin!.revenue).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>Revenue</div>
                        {Object.entries(fin!.revenue).map(([src, amt]) => (
                          <div key={src} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span style={{ fontSize: 12, color: MUTED }}>{src}</span>
                            <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>{fmt(amt)}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${BORDER}`, marginTop: 4 }}>
                          <span style={{ fontSize: 13, color: WHITE, fontWeight: 700 }}>Total Revenue</span>
                          <span style={{ fontSize: 13, color: GREEN, fontWeight: 800 }}>{fmt(fin!.total_revenue)}</span>
                        </div>
                      </div>
                    )}
                    {/* Expense breakdown */}
                    {Object.keys(fin!.expenses).length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>Expenses</div>
                        {Object.entries(fin!.expenses).map(([cat, amt]) => (
                          <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span style={{ fontSize: 12, color: MUTED }}>{cat}</span>
                            <span style={{ fontSize: 12, color: RED, fontWeight: 600 }}>{fmt(amt)}</span>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${BORDER}`, marginTop: 4 }}>
                          <span style={{ fontSize: 13, color: WHITE, fontWeight: 700 }}>Total Expenses</span>
                          <span style={{ fontSize: 13, color: RED, fontWeight: 800 }}>{fmt(fin!.total_expenses)}</span>
                        </div>
                      </div>
                    )}
                    {/* Net Profit */}
                    <div style={{
                      background: fin!.net_profit >= 0 ? GREEN + '18' : RED + '18',
                      border: `1px solid ${fin!.net_profit >= 0 ? GREEN : RED}44`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Net Profit</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: fin!.net_profit >= 0 ? GREEN : RED }}>
                        {fmt(fin!.net_profit)}
                      </span>
                    </div>
                    {/* Top revenue sources */}
                    {topSrc.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 6 }}>
                          Top Revenue Sources
                        </div>
                        {topSrc.map((s, i) => (
                          <div key={s.source} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                            <span style={{ fontSize: 12, color: MUTED }}>#{i + 1} {s.source}</span>
                            <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{fmt(s.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Section>

                {/* Member Metrics */}
                <Section id="members" title="Member Metrics" expanded={expanded.has('members')} onToggle={toggleSection}>
                  <MemberGrowthBar
                    currentTotal={mem!.total_members}
                    prevTotal={Math.max(0, mem!.total_members - mem!.new_this_month)}
                    newThisMonth={mem!.new_this_month}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                    {([
                      ['Total Members',  mem!.total_members,  WHITE],
                      ['Active Members', mem!.active_members, GREEN],
                      ['New This Month', mem!.new_this_month, GOLD],
                      ['Churn Count',    mem!.churn_count,    mem!.churn_count > 0 ? RED : MUTED],
                    ] as [string, number, string][]).map(([label, value, color]) => (
                      <div key={label} style={{
                        background: BG,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 8,
                        padding: '8px 10px',
                      }}>
                        <div style={{ fontSize: 9, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Operational KPIs */}
                <Section id="ops" title="Operational KPIs" expanded={expanded.has('ops')} onToggle={toggleSection}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12 }}>
                    <UtilGauge pct={ops!.court_utilisation_pct} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>
                        Payroll Total
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>{fmt(ops!.payroll_total)}</div>
                      <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>net disbursed</div>
                    </div>
                  </div>
                </Section>

                {/* Compliance Status */}
                <Section id="compliance" title="Compliance Status" expanded={expanded.has('compliance')} onToggle={toggleSection}>
                  <GstTrafficLight total={comp!.gst_liability.total} />
                  <div style={{ marginTop: 14 }}>
                    {([
                      ['CGST', comp!.gst_liability.cgst],
                      ['SGST', comp!.gst_liability.sgst],
                      ['IGST', comp!.gst_liability.igst],
                      ['Total GST', comp!.gst_liability.total],
                    ] as [string, number][]).map(([label, value]) => (
                      <div key={label} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '5px 0',
                        borderBottom: label === 'IGST' ? `1px solid ${BORDER}` : 'none',
                        marginBottom: label === 'IGST' ? 4 : 0,
                      }}>
                        <span style={{ fontSize: 12, color: label === 'Total GST' ? WHITE : MUTED, fontWeight: label === 'Total GST' ? 700 : 400 }}>
                          {label}
                        </span>
                        <span style={{ fontSize: 12, color: label === 'Total GST' ? GOLD : MUTED, fontWeight: label === 'Total GST' ? 800 : 600 }}>
                          {fmtFull(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </Section>

                {/* Download button */}
                <button
                  onClick={() => {
                    const text = toText(report);
                    const period = report.period;
                    downloadText(text, `investor-report-${period.year}-${String(period.month).padStart(2, '0')}.txt`);
                  }}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: `1px solid ${GOLD}`,
                    borderRadius: 10,
                    color: GOLD,
                    padding: '12px 0',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: 4,
                    letterSpacing: 0.5,
                  }}
                >
                  Download as Text
                </button>
              </>
            )}
          </>
        )}

        {/* ── Investment Model Tab ── */}
        {tab === 'model' && (
          <>
            {modelLoading && (
              <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>Loading…</div>
            )}
            {model && (
              <>
                {/* Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {([
                    ['Setup Cost', fmt(model.total_setup_cost_inr)],
                    ['Payback',    `${model.payback_months}mo`],
                    ['IRR',        `${model.irr_pct}%`],
                  ] as [string, string][]).map(([label, value]) => (
                    <div key={label} style={{
                      background: CARD,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 10,
                      padding: '10px 10px',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: 9, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>{label}</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: GOLD }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Setup costs table */}
                <div style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 14,
                }}>
                  <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                    Setup Cost Breakdown
                  </div>
                  {model.setup_costs.map((row, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 0',
                      borderBottom: i < model.setup_costs.length - 1 ? `1px solid ${BORDER}` : 'none',
                    }}>
                      <span style={{ fontSize: 12, color: MUTED, flex: 1 }}>{row.item}</span>
                      <span style={{ fontSize: 12, color: WHITE, fontWeight: 700 }}>{fmt(row.amount_inr)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${GOLD}44` }}>
                    <span style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>Total</span>
                    <span style={{ fontSize: 13, color: GOLD, fontWeight: 800 }}>{fmt(model.total_setup_cost_inr)}</span>
                  </div>
                </div>

                {/* Payback Curve */}
                <div style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                  marginBottom: 14,
                }}>
                  <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                    Payback Curve (Months 1–36)
                  </div>
                  <PaybackCurve
                    data={model.monthly_ebitda}
                    setupCost={model.total_setup_cost_inr}
                    paybackMonth={model.payback_months}
                  />
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 16, height: 2, background: GOLD }} />
                      <span style={{ fontSize: 8, color: GRAY }}>Cumulative EBITDA</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 16, height: 1, background: GOLD, borderTop: '1px dashed' }} />
                      <span style={{ fontSize: 8, color: GRAY }}>85L target</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 16, height: 1, background: GREEN, borderTop: '1px dashed' }} />
                      <span style={{ fontSize: 8, color: GRAY }}>Payback M28</span>
                    </div>
                  </div>
                </div>

                {/* Monthly EBITDA highlights */}
                <div style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  padding: '12px 14px',
                }}>
                  <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
                    Monthly EBITDA Milestones
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[6, 12, 24, 36].map((m) => {
                      const pt = model.monthly_ebitda.find((d) => d.month === m);
                      const ebitda = pt?.ebitda ?? 0;
                      return (
                        <div key={m} style={{
                          background: BG,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 8,
                          padding: '8px 10px',
                        }}>
                          <div style={{ fontSize: 9, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 }}>
                            Month {m}
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: ebitda >= 0 ? GOLD : RED }}>
                            {fmt(ebitda)}
                          </div>
                          <div style={{ fontSize: 9, color: MUTED, marginTop: 1 }}>EBITDA/mo</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default InvestorReport;
