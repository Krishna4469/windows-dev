import { useEffect, useState } from 'react';

interface Lead {
  id: string;
  venue_id: string;
  name: string;
  phone: string;
  email: string | null;
  source: string;
  sport_interest: string | null;
  status: string;
  assigned_to: string | null;
  notes: string | null;
  last_contacted_at: string | null;
  created_at: string;
}

interface LifecycleEvent {
  id: string;
  lead_id: string;
  event_type: string;
  description: string;
  created_by: string;
  created_at: string;
}

interface Timeline {
  lead: Lead;
  events: LifecycleEvent[];
}

interface CorporateAccount {
  id: string;
  venue_id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  employee_count: number;
  membership_type: string;
  monthly_credits: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface SponsorAccount {
  id: string;
  venue_id: string;
  brand_name: string;
  contact_name: string;
  contact_email: string;
  sponsorship_type: string;
  value_inr: string;
  start_date: string;
  end_date: string;
  deliverables: unknown;
  status: string;
  created_at: string;
  activations_count: number;
}

const OBSIDIAN = '#111118';
const CARD_BG = '#18181F';
const SURFACE = '#1C1C26';
const MERLOT = '#E9B4BD';
const MUTED = '#6B7280';
const FAINT = '#4B5563';
const SUCCESS = '#4ADE80';

const STATUS_COLORS: Record<string, string> = {
  'new': '#60A5FA',
  'contacted': '#FBBF24',
  'trial-booked': '#C084FC',
  'converted': '#4ADE80',
  'lost': '#9CA3AF',
};

const STATUS_LABELS: Record<string, string> = {
  'new': 'New',
  'contacted': 'Contacted',
  'trial-booked': 'Trial Booked',
  'converted': 'Converted',
  'lost': 'Lost',
};

const SOURCE_COLORS: Record<string, string> = {
  'walk-in': '#10B981',
  'referral': '#60A5FA',
  'instagram': '#E879F9',
  'google': '#FBBF24',
  'event': '#FB923C',
  'whatsapp': '#4ADE80',
};

const STATUS_ORDER = ['new', 'contacted', 'trial-booked', 'converted', 'lost'] as const;

const EVENT_TYPE_ICONS: Record<string, string> = {
  'status-change': '🔄',
  'note-added': '📝',
  'contacted': '📞',
  'trial-completed': '🎾',
  'converted': '✅',
};

const TIER_COLORS: Record<string, string> = {
  bronze: '#CD7F32',
  silver: '#94A3B8',
  gold: '#F59E0B',
  platinum: '#C084FC',
};

const CORP_STATUS_COLORS: Record<string, string> = {
  prospect: '#60A5FA',
  active: '#4ADE80',
  inactive: '#9CA3AF',
  churned: '#EF4444',
};

const SPONSOR_TYPE_COLORS: Record<string, string> = {
  'court-naming': '#F43F5E',
  'event': '#F59E0B',
  'digital': '#60A5FA',
  'apparel': '#A78BFA',
  'food-beverage': '#34D399',
};

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function daysRemaining(endDate: string): number {
  return Math.ceil((new Date(endDate).getTime() - Date.now()) / 86_400_000);
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return (
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
}

function formatCurrency(inr: string | number): string {
  const num = Number(inr);
  if (num >= 10_000_000) return `₹${(num / 10_000_000).toFixed(1)}Cr`;
  if (num >= 100_000) return `₹${(num / 100_000).toFixed(1)}L`;
  if (num >= 1_000) return `₹${(num / 1_000).toFixed(1)}K`;
  return `₹${num.toLocaleString('en-IN')}`;
}

type Tab = 'leads' | 'corporate' | 'sponsors';

const TAB_SUBTITLES: Record<Tab, string> = {
  leads: 'Leads & Lifecycle',
  corporate: 'Corporate Pipeline',
  sponsors: 'Sponsor Tracking',
};

export function CRMDashboard() {
  const [tab, setTab] = useState<Tab>('leads');

  // Leads
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timelines, setTimelines] = useState<Record<string, LifecycleEvent[]>>({});
  const [loadingTimeline, setLoadingTimeline] = useState<string | null>(null);

  // Corporate
  const [corporateAccounts, setCorporateAccounts] = useState<CorporateAccount[]>([]);
  const [loadingCorporate, setLoadingCorporate] = useState(false);
  const [corporateLoaded, setCorporateLoaded] = useState(false);

  // Sponsors
  const [sponsorAccounts, setSponsorAccounts] = useState<SponsorAccount[]>([]);
  const [loadingSponsors, setLoadingSponsors] = useState(false);
  const [sponsorsLoaded, setSponsorsLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/crm/leads')
      .then((r) => r.json() as Promise<Lead[]>)
      .then((data) => {
        setLeads(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'corporate' && !corporateLoaded) {
      setLoadingCorporate(true);
      fetch('/api/crm/corporate')
        .then((r) => r.json() as Promise<CorporateAccount[]>)
        .then((data) => {
          setCorporateAccounts(data);
          setLoadingCorporate(false);
          setCorporateLoaded(true);
        })
        .catch(() => setLoadingCorporate(false));
    }
  }, [tab, corporateLoaded]);

  useEffect(() => {
    if (tab === 'sponsors' && !sponsorsLoaded) {
      setLoadingSponsors(true);
      fetch('/api/crm/sponsors')
        .then((r) => r.json() as Promise<SponsorAccount[]>)
        .then((data) => {
          setSponsorAccounts(data);
          setLoadingSponsors(false);
          setSponsorsLoaded(true);
        })
        .catch(() => setLoadingSponsors(false));
    }
  }, [tab, sponsorsLoaded]);

  const handleExpandLead = (id: string): void => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!timelines[id]) {
      setLoadingTimeline(id);
      fetch(`/api/crm/leads/${id}/timeline`)
        .then((r) => r.json() as Promise<Timeline>)
        .then((data) => {
          setTimelines((prev) => ({ ...prev, [id]: data.events }));
          setLoadingTimeline(null);
        })
        .catch(() => setLoadingTimeline(null));
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const totalLeads = leads.length;
  const newToday = leads.filter(
    (l) => l.created_at.slice(0, 10) === today && l.status === 'new',
  ).length;
  const trialsBooked = leads.filter((l) => l.status === 'trial-booked').length;
  const convertedThisMonth = leads.filter(
    (l) => l.status === 'converted' && l.created_at.slice(0, 7) === thisMonth,
  ).length;

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    leads: leads.filter((l) => l.status === status),
  }));

  const tabs: { key: Tab; label: string }[] = [
    { key: 'leads', label: 'Leads' },
    { key: 'corporate', label: 'Corporate' },
    { key: 'sponsors', label: 'Sponsors' },
  ];

  return (
    <div className="min-h-full px-4 py-6" style={{ backgroundColor: OBSIDIAN }}>
      <h1 className="mb-1 text-xl font-semibold text-white">CRM</h1>
      <p className="mb-4 text-xs" style={{ color: MUTED }}>
        {TAB_SUBTITLES[tab]}
      </p>

      {/* Tab switcher */}
      <div className="mb-5 flex gap-1 rounded-xl p-1" style={{ backgroundColor: CARD_BG }}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            className="flex-1 rounded-lg py-2 text-xs font-medium transition-colors"
            style={{
              backgroundColor: tab === key ? SURFACE : 'transparent',
              color: tab === key ? '#FFFFFF' : MUTED,
            }}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Leads tab ── */}
      {tab === 'leads' && (
        loading ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-sm" style={{ color: MUTED }}>Loading leads...</p>
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-4 gap-2">
              {[
                { label: 'Total', value: totalLeads, color: MERLOT },
                { label: 'New Today', value: newToday, color: STATUS_COLORS['new'] ?? MERLOT },
                { label: 'Trials', value: trialsBooked, color: STATUS_COLORS['trial-booked'] ?? MERLOT },
                { label: 'Converted', value: convertedThisMonth, color: SUCCESS },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center rounded-xl py-3"
                  style={{ backgroundColor: CARD_BG }}
                >
                  <span className="text-lg font-bold" style={{ color }}>{value}</span>
                  <span className="mt-0.5 text-center text-[10px] leading-tight" style={{ color: MUTED }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-5">
              {grouped.map(({ status, leads: statusLeads }) => {
                if (statusLeads.length === 0) return null;
                const color = STATUS_COLORS[status] ?? MUTED;
                return (
                  <div key={status}>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span
                        className="text-xs font-semibold uppercase tracking-wider"
                        style={{ color }}
                      >
                        {STATUS_LABELS[status] ?? status}
                      </span>
                      <span
                        className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: SURFACE, color: MUTED }}
                      >
                        {statusLeads.length}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {statusLeads.map((lead) => {
                        const isExpanded = expandedId === lead.id;
                        const srcColor = SOURCE_COLORS[lead.source] ?? MUTED;
                        const days = daysSince(lead.created_at);
                        const events = timelines[lead.id];
                        const isLoadingThis = loadingTimeline === lead.id;

                        return (
                          <div
                            key={lead.id}
                            className="rounded-xl"
                            style={{ backgroundColor: CARD_BG }}
                          >
                            <button
                              className="w-full rounded-xl p-4 text-left"
                              onClick={() => handleExpandLead(lead.id)}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {lead.name}
                                  </p>
                                  <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
                                    {lead.phone}
                                  </p>
                                </div>
                                <span
                                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                                  style={{ backgroundColor: `${srcColor}22`, color: srcColor }}
                                >
                                  {lead.source}
                                </span>
                              </div>

                              <div
                                className="mt-2 flex items-center gap-3 text-xs"
                                style={{ color: FAINT }}
                              >
                                {lead.sport_interest && (
                                  <span
                                    className="rounded px-1.5 py-0.5"
                                    style={{ backgroundColor: SURFACE, color: MERLOT }}
                                  >
                                    {lead.sport_interest}
                                  </span>
                                )}
                                <span>{days === 0 ? 'Today' : `${days}d ago`}</span>
                                <span className="ml-auto">
                                  Last contact: {formatShortDate(lead.last_contacted_at)}
                                </span>
                              </div>
                            </button>

                            {isExpanded && (
                              <div
                                className="border-t px-4 pb-4 pt-3"
                                style={{ borderColor: FAINT + '55' }}
                              >
                                {lead.notes && (
                                  <p
                                    className="mb-3 rounded-lg px-3 py-2 text-xs"
                                    style={{ backgroundColor: SURFACE, color: MUTED }}
                                  >
                                    {lead.notes}
                                  </p>
                                )}
                                <p className="mb-2 text-xs font-medium" style={{ color: MUTED }}>
                                  Timeline
                                </p>
                                {isLoadingThis ? (
                                  <p className="text-xs" style={{ color: FAINT }}>Loading...</p>
                                ) : events && events.length > 0 ? (
                                  <div className="flex flex-col gap-2">
                                    {events.map((ev) => (
                                      <div key={ev.id} className="flex gap-2">
                                        <span className="mt-0.5 shrink-0 text-sm">
                                          {EVENT_TYPE_ICONS[ev.event_type] ?? '•'}
                                        </span>
                                        <div className="min-w-0">
                                          <p className="text-xs text-white">{ev.description}</p>
                                          <p
                                            className="mt-0.5 text-[10px]"
                                            style={{ color: FAINT }}
                                          >
                                            {formatDateTime(ev.created_at)}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs" style={{ color: FAINT }}>No events yet.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {leads.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-16">
                  <p className="text-3xl">📋</p>
                  <p className="text-sm text-white">No leads yet</p>
                  <p className="text-xs" style={{ color: MUTED }}>
                    Captured leads will appear here.
                  </p>
                </div>
              )}
            </div>
          </>
        )
      )}

      {/* ── Corporate tab ── */}
      {tab === 'corporate' && (
        loadingCorporate ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-sm" style={{ color: MUTED }}>Loading corporate accounts...</p>
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: corporateAccounts.length, color: MERLOT },
                {
                  label: 'Active',
                  value: corporateAccounts.filter((c) => c.status === 'active').length,
                  color: SUCCESS,
                },
                {
                  label: 'Prospects',
                  value: corporateAccounts.filter((c) => c.status === 'prospect').length,
                  color: '#60A5FA',
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center rounded-xl py-3"
                  style={{ backgroundColor: CARD_BG }}
                >
                  <span className="text-lg font-bold" style={{ color }}>{value}</span>
                  <span
                    className="mt-0.5 text-center text-[10px] leading-tight"
                    style={{ color: MUTED }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {corporateAccounts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16">
                <p className="text-3xl">🏢</p>
                <p className="text-sm text-white">No corporate accounts</p>
                <p className="text-xs" style={{ color: MUTED }}>
                  Corporate accounts will appear here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {corporateAccounts.map((account) => {
                  const tierColor = TIER_COLORS[account.membership_type] ?? MUTED;
                  const statusColor = CORP_STATUS_COLORS[account.status] ?? MUTED;
                  return (
                    <div
                      key={account.id}
                      className="rounded-xl p-4"
                      style={{ backgroundColor: CARD_BG }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {account.company_name}
                          </p>
                          <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
                            {account.contact_name}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                            style={{ backgroundColor: `${tierColor}22`, color: tierColor }}
                          >
                            {account.membership_type}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{ backgroundColor: `${statusColor}22`, color: statusColor }}
                          >
                            {account.status}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs" style={{ color: MUTED }}>
                        <span>{account.employee_count.toLocaleString()} employees</span>
                        <span style={{ color: FAINT }}>·</span>
                        <span>{account.monthly_credits.toLocaleString()} credits/mo</span>
                      </div>

                      {account.notes && (
                        <p
                          className="mt-2 rounded-lg px-3 py-2 text-xs"
                          style={{ backgroundColor: SURFACE, color: MUTED }}
                        >
                          {account.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )
      )}

      {/* ── Sponsors tab ── */}
      {tab === 'sponsors' && (
        loadingSponsors ? (
          <div className="flex min-h-[200px] items-center justify-center">
            <p className="text-sm" style={{ color: MUTED }}>Loading sponsors...</p>
          </div>
        ) : (
          <>
            <div className="mb-5 grid grid-cols-3 gap-2">
              {[
                { label: 'Total', value: sponsorAccounts.length, color: MERLOT },
                {
                  label: 'Active',
                  value: sponsorAccounts.filter((s) => daysRemaining(s.end_date) > 0).length,
                  color: SUCCESS,
                },
                {
                  label: 'Total Value',
                  value: formatCurrency(
                    sponsorAccounts.reduce((sum, s) => sum + Number(s.value_inr), 0),
                  ),
                  color: '#F59E0B',
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="flex flex-col items-center rounded-xl py-3"
                  style={{ backgroundColor: CARD_BG }}
                >
                  <span className="text-base font-bold" style={{ color }}>{value}</span>
                  <span
                    className="mt-0.5 text-center text-[10px] leading-tight"
                    style={{ color: MUTED }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {sponsorAccounts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16">
                <p className="text-3xl">🤝</p>
                <p className="text-sm text-white">No sponsors yet</p>
                <p className="text-xs" style={{ color: MUTED }}>
                  Sponsor accounts will appear here.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {sponsorAccounts.map((sponsor) => {
                  const remaining = daysRemaining(sponsor.end_date);
                  const isActive = remaining > 0;
                  const typeColor = SPONSOR_TYPE_COLORS[sponsor.sponsorship_type] ?? MUTED;
                  const activationsCount = Number(sponsor.activations_count);
                  return (
                    <div
                      key={sponsor.id}
                      className="rounded-xl p-4"
                      style={{ backgroundColor: CARD_BG }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {sponsor.brand_name}
                          </p>
                          <p className="mt-0.5 text-xs" style={{ color: MUTED }}>
                            {sponsor.contact_name}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                            style={{ backgroundColor: `${typeColor}22`, color: typeColor }}
                          >
                            {sponsor.sponsorship_type.replace(/-/g, ' ')}
                          </span>
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                            style={{
                              backgroundColor: isActive ? '#4ADE8022' : '#9CA3AF22',
                              color: isActive ? SUCCESS : '#9CA3AF',
                            }}
                          >
                            {isActive ? 'active' : 'expired'}
                          </span>
                        </div>
                      </div>

                      <div
                        className="flex flex-wrap items-center gap-3 text-xs"
                        style={{ color: MUTED }}
                      >
                        <span className="font-semibold" style={{ color: '#F59E0B' }}>
                          {formatCurrency(sponsor.value_inr)}
                        </span>
                        {isActive ? (
                          <span style={{ color: remaining <= 30 ? '#F59E0B' : MUTED }}>
                            {remaining}d remaining
                          </span>
                        ) : (
                          <span style={{ color: FAINT }}>
                            Ended {formatShortDate(sponsor.end_date)}
                          </span>
                        )}
                        <span
                          className="ml-auto"
                          style={{ color: activationsCount > 0 ? MERLOT : FAINT }}
                        >
                          {activationsCount} activation{activationsCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
