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

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
}

function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
    ' · ' +
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function CRMDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [timelines, setTimelines] = useState<Record<string, LifecycleEvent[]>>({});
  const [loadingTimeline, setLoadingTimeline] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crm/leads')
      .then((r) => r.json() as Promise<Lead[]>)
      .then((data) => {
        setLeads(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  if (loading) {
    return (
      <div
        className="flex min-h-full items-center justify-center"
        style={{ backgroundColor: OBSIDIAN }}
      >
        <p className="text-sm" style={{ color: MUTED }}>Loading leads...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full px-4 py-6" style={{ backgroundColor: OBSIDIAN }}>
      <h1 className="mb-1 text-xl font-semibold text-white">CRM</h1>
      <p className="mb-5 text-xs" style={{ color: MUTED }}>Leads & Lifecycle</p>

      {/* Summary pills */}
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
            <span className="text-lg font-bold" style={{ color }}>
              {value}
            </span>
            <span className="mt-0.5 text-center text-[10px] leading-tight" style={{ color: MUTED }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Kanban sections */}
      <div className="flex flex-col gap-5">
        {grouped.map(({ status, leads: statusLeads }) => {
          if (statusLeads.length === 0) return null;
          const color = STATUS_COLORS[status] ?? MUTED;
          return (
            <div key={status}>
              {/* Section header */}
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
                  {STATUS_LABELS[status] ?? status}
                </span>
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: SURFACE, color: MUTED }}
                >
                  {statusLeads.length}
                </span>
              </div>

              {/* Lead cards */}
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
                      {/* Card header — tap to expand */}
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

                        <div className="mt-2 flex items-center gap-3 text-xs" style={{ color: FAINT }}>
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

                      {/* Expanded timeline */}
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
                                    <p className="mt-0.5 text-[10px]" style={{ color: FAINT }}>
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
            <p className="text-xs" style={{ color: MUTED }}>Captured leads will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
