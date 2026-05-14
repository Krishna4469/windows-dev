import { useState, useEffect } from 'react';

const BG     = '#0D0D11';
const CARD   = '#18181F';
const BORDER = '#2a2a38';
const WHITE  = '#FFFFFF';
const GRAY   = '#6B7280';
const MUTED  = '#9CA3AF';
const GOLD   = '#F59E0B';
const GREEN  = '#22C55E';
const RED    = '#EF4444';
const BLUE   = '#3B82F6';

const STATUS_CONFIG = {
  prospect:   { color: BLUE,  bg: BLUE  + '22', label: 'Prospect' },
  onboarding: { color: GOLD,  bg: GOLD  + '22', label: 'Onboarding' },
  live:       { color: GREEN, bg: GREEN + '22', label: 'Live' },
  paused:     { color: RED,   bg: RED   + '22', label: 'Paused' },
} as const;

type VenueStatus = keyof typeof STATUS_CONFIG;

interface FranchiseVenue {
  id: string;
  franchisor_id: string;
  venue_name: string;
  city: string;
  country: string;
  operator_name: string;
  operator_phone: string;
  launch_date: string | null;
  status: string;
  monthly_fee_inr: string;
  revenue_share_pct: string;
  created_at: string;
}

interface VenueMetric {
  id: string;
  venue_id: string;
  metric_date: string;
  total_members: number;
  active_members: number;
  monthly_revenue_inr: string;
  court_utilisation_pct: string;
  nps_score: string | null;
  created_at: string;
}

interface PortfolioSummary {
  total_venues: number;
  venues_by_status: Record<string, number>;
  total_members: number;
  total_monthly_revenue_inr: number;
  avg_court_utilisation_pct: number;
  best_performing_venue: { id: string; venue_name: string; monthly_revenue_inr: number } | null;
}

function fmt(n: number, decimals = 0): string {
  return n.toLocaleString('en-IN', { maximumFractionDigits: decimals });
}

function fmtInr(n: number): string {
  if (n >= 100000) return `₹${fmt(n / 100000, 1)}L`;
  if (n >= 1000)   return `₹${fmt(n / 1000, 1)}K`;
  return `₹${fmt(n)}`;
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as VenueStatus] ?? { color: GRAY, bg: GRAY + '22', label: status };
  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.color}55`,
      borderRadius: 999,
      padding: '2px 10px',
      fontSize: 10,
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    }}>
      {cfg.label}
    </span>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: WHITE }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function UtilBar({ pct }: { pct: number }) {
  const color = pct >= 75 ? GREEN : pct >= 50 ? GOLD : RED;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 }}>Court Utilisation</span>
        <span style={{ fontSize: 9, color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 4, background: BORDER, borderRadius: 99 }}>
        <div style={{
          height: '100%',
          width: `${Math.min(100, pct)}%`,
          background: color,
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

function VenueCard({
  venue,
  latestMetric,
  expanded,
  onToggle,
  metrics,
}: {
  venue: FranchiseVenue;
  latestMetric: VenueMetric | null;
  expanded: boolean;
  onToggle: () => void;
  metrics: VenueMetric[];
}) {
  const monthlyFee  = parseFloat(venue.monthly_fee_inr);
  const revShare    = parseFloat(venue.revenue_share_pct);
  const latestRev   = latestMetric ? parseFloat(latestMetric.monthly_revenue_inr) : 0;
  const revShareAmt = latestRev * revShare / 100;
  const totalDue    = monthlyFee + revShareAmt;
  const util        = latestMetric ? parseFloat(latestMetric.court_utilisation_pct) : 0;

  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 14,
      marginBottom: 12,
      overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '14px 16px',
          cursor: 'pointer',
          textAlign: 'left',
          color: WHITE,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: WHITE }}>{venue.venue_name}</div>
            <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{venue.city} · {venue.operator_name}</div>
          </div>
          <StatusBadge status={venue.status} />
        </div>
        {latestMetric && (
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            <div>
              <div style={{ fontSize: 9, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6 }}>Members</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>{fmt(latestMetric.total_members)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: GRAY, textTransform: 'uppercase', letterSpacing: 0.6 }}>Revenue</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>{fmtInr(latestRev)}</div>
            </div>
          </div>
        )}
        {latestMetric && <UtilBar pct={util} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 14px', borderTop: `1px solid ${BORDER}` }}>
          {/* Revenue share calculator */}
          <div style={{
            background: GOLD + '11',
            border: `1px solid ${GOLD}33`,
            borderRadius: 10,
            padding: '12px 14px',
            marginTop: 14,
            marginBottom: 14,
          }}>
            <div style={{
              fontSize: 11,
              color: GOLD,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 10,
            }}>
              Revenue Share Calculator
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: MUTED }}>Monthly Fee</span>
              <span style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>{fmtInr(monthlyFee)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: MUTED }}>
                Rev Share ({revShare}% of {fmtInr(latestRev)})
              </span>
              <span style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>{fmtInr(revShareAmt)}</span>
            </div>
            <div style={{ height: 1, background: GOLD + '33', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>Total Due</span>
              <span style={{ fontSize: 13, color: GOLD, fontWeight: 800 }}>{fmtInr(totalDue)}</span>
            </div>
          </div>

          {/* Metrics history */}
          {metrics.length > 0 && (
            <div>
              <div style={{
                fontSize: 10,
                color: GRAY,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 8,
              }}>
                Metrics History
              </div>
              {metrics.map((m) => (
                <div key={m.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: `1px solid ${BORDER}`,
                }}>
                  <div>
                    <div style={{ fontSize: 12, color: WHITE, fontWeight: 600 }}>{m.metric_date}</div>
                    <div style={{ fontSize: 10, color: MUTED }}>
                      {m.active_members}/{m.total_members} active · {parseFloat(m.court_utilisation_pct)}% util
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, color: GOLD, fontWeight: 700 }}>
                      {fmtInr(parseFloat(m.monthly_revenue_inr))}
                    </div>
                    {m.nps_score !== null && (
                      <div style={{ fontSize: 10, color: MUTED }}>NPS {m.nps_score}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Contact */}
          <div style={{ marginTop: 12, fontSize: 12, color: MUTED }}>
            {venue.operator_phone}
            {venue.launch_date && ` · Launch: ${venue.launch_date}`}
          </div>
        </div>
      )}
    </div>
  );
}

export function FranchiseDashboard({ franchisorId }: { franchisorId: string }) {
  const [venues, setVenues]       = useState<FranchiseVenue[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [metrics, setMetrics]     = useState<Record<string, VenueMetric[]>>({});
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  async function load() {
    setLoading(true);
    const [vRes, pRes] = await Promise.all([
      fetch(`/api/franchise/venues?franchisor_id=${franchisorId}`),
      fetch(`/api/franchise/portfolio?franchisor_id=${franchisorId}`),
    ]);
    if (vRes.ok) setVenues(await vRes.json() as FranchiseVenue[]);
    if (pRes.ok) setPortfolio(await pRes.json() as PortfolioSummary);
    setLoading(false);
  }

  async function loadMetrics(venueId: string) {
    if (metrics[venueId]) return;
    const res = await fetch(`/api/franchise/venues/${venueId}/metrics`);
    if (res.ok) {
      const data = await res.json() as VenueMetric[];
      setMetrics((prev) => ({ ...prev, [venueId]: data }));
    }
  }

  useEffect(() => { void load(); }, [franchisorId]);

  function toggleVenue(id: string) {
    if (expanded === id) {
      setExpanded(null);
    } else {
      setExpanded(id);
      void loadMetrics(id);
    }
  }

  const latestByVenue: Record<string, VenueMetric | null> = {};
  for (const v of venues) {
    const ms = metrics[v.id] ?? [];
    latestByVenue[v.id] = ms.length > 0 ? (ms[0] ?? null) : null;
  }

  const liveCount = portfolio?.venues_by_status?.['live'] ?? 0;

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
          <span style={{ color: GOLD }}>◆</span> Franchise Portfolio
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: GRAY, padding: '40px 0' }}>Loading…</div>
        ) : (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              <SummaryCard
                label="Live Venues"
                value={String(liveCount)}
                sub={`of ${portfolio?.total_venues ?? 0} total`}
              />
              <SummaryCard
                label="Total Members"
                value={fmt(portfolio?.total_members ?? 0)}
                sub="across all venues"
              />
              <SummaryCard
                label="Total MRR"
                value={fmtInr(portfolio?.total_monthly_revenue_inr ?? 0)}
                sub="monthly revenue"
              />
              <SummaryCard
                label="Avg Utilisation"
                value={`${portfolio?.avg_court_utilisation_pct ?? 0}%`}
                sub="court utilisation"
              />
            </div>

            {/* Best performer */}
            {portfolio?.best_performing_venue && (
              <div style={{
                background: GOLD + '11',
                border: `1px solid ${GOLD}33`,
                borderRadius: 12,
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}>
                <div>
                  <div style={{ fontSize: 10, color: GOLD, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
                    Top Performer
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>
                    {portfolio.best_performing_venue.venue_name}
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: GOLD }}>
                  {fmtInr(portfolio.best_performing_venue.monthly_revenue_inr)}
                </div>
              </div>
            )}

            {/* Status breakdown */}
            {portfolio && (
              <div style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 20,
                display: 'flex',
                gap: 12,
                justifyContent: 'space-around',
              }}>
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <div key={key} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: cfg.color }}>
                      {portfolio.venues_by_status[key] ?? 0}
                    </div>
                    <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                      {cfg.label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Venue list */}
            <div style={{ fontSize: 11, color: GRAY, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>
              Venues
            </div>
            {venues.length === 0 ? (
              <div style={{ textAlign: 'center', color: MUTED, padding: '20px 0' }}>No venues yet</div>
            ) : (
              venues.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  latestMetric={latestByVenue[venue.id] ?? null}
                  expanded={expanded === venue.id}
                  onToggle={() => toggleVenue(venue.id)}
                  metrics={metrics[venue.id] ?? []}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default FranchiseDashboard;
