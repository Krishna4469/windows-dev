import { useState } from 'react';

const BG      = '#0D0D11';
const CARD    = '#18181F';
const AMBER   = '#F59E0B';
const WHITE   = '#FFFFFF';
const GRAY    = '#6B7280';
const BORDER  = '#2a2a38';
const MUTED   = '#9CA3AF';

type Tab = 'sac' | 'gstr1' | 'gstr3b';

interface SACRow {
  service_type: string;
  sac_code: string;
  rate: number;
  label: string;
}

interface B2CRow {
  service_type: string;
  sac: string;
  taxable_value: number;
  rate: number;
  central_amount: number;
  state_amount: number;
  total_gst: number;
}

interface GSTR1Data {
  fp: string;
  b2c_others: B2CRow[];
  total_taxable_value: number;
  total_gst: number;
}

interface GSTR3BData {
  fp: string;
  outward_taxable_supplies: { taxable_value: number; central_tax: number; state_tax: number; integrated_tax: number };
  tax_payable: { cgst: number; sgst: number; igst: number; total: number };
}

interface GSTDashboardProps {
  venueId: string;
}

const SAC_STATIC: SACRow[] = [
  { service_type: 'court-booking',      sac_code: '999721', rate: 18, label: 'Court Booking' },
  { service_type: 'wellness-treatment', sac_code: '999311', rate: 18, label: 'Wellness Treatment' },
  { service_type: 'cafe-food',          sac_code: '996331', rate: 5,  label: 'Cafe Food' },
  { service_type: 'cafe-beverage',      sac_code: '996331', rate: 18, label: 'Cafe Beverage' },
  { service_type: 'event-ticket',       sac_code: '999691', rate: 18, label: 'Event Ticket' },
  { service_type: 'membership-credits', sac_code: '999799', rate: 18, label: 'Membership Credits' },
  { service_type: 'co-working',         sac_code: '997212', rate: 18, label: 'Co-working Space' },
  { service_type: 'kids-activity',      sac_code: '999691', rate: 18, label: 'Kids Activity' },
];

function fmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currentMonthYear(): { month: number; year: number } {
  const d = new Date();
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function GSTDashboard({ venueId }: GSTDashboardProps) {
  const [tab, setTab] = useState<Tab>('sac');
  const { month: curMonth, year: curYear } = currentMonthYear();
  const [month, setMonth] = useState(curMonth);
  const [year, setYear]   = useState(curYear);

  const [gstr1, setGstr1]       = useState<GSTR1Data | null>(null);
  const [gstr3b, setGstr3b]     = useState<GSTR3BData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function fetchGSTR1() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/gst/gstr1?venue_id=${venueId}&month=${month}&year=${year}`);
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      setGstr1(await res.json() as GSTR1Data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load GSTR-1');
    } finally {
      setLoading(false);
    }
  }

  async function fetchGSTR3B() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/gst/gstr3b?venue_id=${venueId}&month=${month}&year=${year}`);
      if (!res.ok) throw new Error((await res.json() as { error: string }).error);
      setGstr3b(await res.json() as GSTR3BData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load GSTR-3B');
    } finally {
      setLoading(false);
    }
  }

  const tabStyle = (t: Tab): React.CSSProperties => ({
    flex: 1,
    padding: '10px 0',
    background: tab === t ? AMBER : CARD,
    color: tab === t ? '#000' : GRAY,
    border: 'none',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
    borderBottom: tab === t ? `2px solid ${AMBER}` : `2px solid ${BORDER}`,
  });

  return (
    <div style={{ background: BG, minHeight: '100vh', color: WHITE, fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 11, color: AMBER, fontWeight: 700, letterSpacing: 1 }}>GST ENGINE</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>GST Dashboard</div>
        <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Karnataka · GSTIN 29AAAAA0000A1Z5</div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
        <button style={tabStyle('sac')}   onClick={() => setTab('sac')}>SAC Codes</button>
        <button style={tabStyle('gstr1')} onClick={() => setTab('gstr1')}>GSTR-1</button>
        <button style={tabStyle('gstr3b')} onClick={() => setTab('gstr3b')}>GSTR-3B</button>
      </div>

      <div style={{ padding: 16 }}>
        {/* SAC Codes Tab */}
        {tab === 'sac' && (
          <div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>
              Service Accounting Codes mapped to GST rates
            </div>
            {SAC_STATIC.map((row) => (
              <div
                key={row.service_type}
                style={{
                  background: CARD,
                  borderRadius: 10,
                  padding: '12px 14px',
                  marginBottom: 8,
                  border: `1px solid ${BORDER}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: GRAY, marginTop: 2 }}>SAC {row.sac_code}</div>
                </div>
                <div
                  style={{
                    background: row.rate === 5 ? '#1a2e1a' : '#1a1a2e',
                    color: row.rate === 5 ? '#4ade80' : AMBER,
                    fontWeight: 700,
                    fontSize: 13,
                    padding: '4px 10px',
                    borderRadius: 20,
                    border: `1px solid ${row.rate === 5 ? '#4ade8033' : '#F59E0B33'}`,
                  }}
                >
                  {row.rate}% GST
                </div>
              </div>
            ))}
          </div>
        )}

        {/* GSTR-1 Tab */}
        {tab === 'gstr1' && (
          <div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>
              B2C outward supplies — intra-state Karnataka
            </div>

            {/* Month/Year picker */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={{ flex: 1, background: CARD, color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={{ flex: 1, background: CARD, color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
              >
                {[curYear - 1, curYear, curYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={fetchGSTR1}
                disabled={loading}
                style={{
                  background: AMBER, color: '#000', border: 'none', borderRadius: 8,
                  padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? '…' : 'Generate'}
              </button>
            </div>

            {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            {gstr1 && (
              <>
                <div style={{ fontSize: 12, color: AMBER, fontWeight: 700, marginBottom: 10 }}>
                  Filing Period: {gstr1.fp}
                </div>
                {gstr1.b2c_others.length === 0 ? (
                  <div style={{ color: GRAY, fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No taxable supplies for this period</div>
                ) : (
                  gstr1.b2c_others.map((row, i) => (
                    <div
                      key={i}
                      style={{ background: CARD, borderRadius: 10, padding: '12px 14px', marginBottom: 8, border: `1px solid ${BORDER}` }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{row.service_type}</span>
                        <span style={{ fontSize: 12, color: GRAY }}>SAC {row.sac}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: MUTED }}>
                        <span>Taxable ₹{fmt(row.taxable_value)}</span>
                        <span>CGST ₹{fmt(row.central_amount)}</span>
                        <span>SGST ₹{fmt(row.state_amount)}</span>
                      </div>
                    </div>
                  ))
                )}
                <div style={{ background: '#1a1a10', borderRadius: 10, padding: '12px 14px', border: `1px solid ${AMBER}44`, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: MUTED }}>Total Taxable</span>
                    <span style={{ fontWeight: 700 }}>₹{fmt(gstr1.total_taxable_value)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 4 }}>
                    <span style={{ color: MUTED }}>Total GST</span>
                    <span style={{ fontWeight: 700, color: AMBER }}>₹{fmt(gstr1.total_gst)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* GSTR-3B Tab */}
        {tab === 'gstr3b' && (
          <div>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 14 }}>
              Monthly GST summary return
            </div>

            {/* Month/Year picker */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={{ flex: 1, background: CARD, color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={{ flex: 1, background: CARD, color: WHITE, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 10px', fontSize: 13 }}
              >
                {[curYear - 1, curYear, curYear + 1].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button
                onClick={fetchGSTR3B}
                disabled={loading}
                style={{
                  background: AMBER, color: '#000', border: 'none', borderRadius: 8,
                  padding: '8px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? '…' : 'Load'}
              </button>
            </div>

            {error && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>}

            {gstr3b && (
              <>
                <div style={{ fontSize: 12, color: AMBER, fontWeight: 700, marginBottom: 12 }}>
                  Filing Period: {gstr3b.fp}
                </div>

                {/* Outward supplies card */}
                <div style={{ background: CARD, borderRadius: 12, padding: '16px', border: `1px solid ${BORDER}`, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: AMBER, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
                    OUTWARD TAXABLE SUPPLIES
                  </div>
                  {([
                    ['Taxable Value', gstr3b.outward_taxable_supplies.taxable_value],
                    ['CGST',         gstr3b.outward_taxable_supplies.central_tax],
                    ['SGST',         gstr3b.outward_taxable_supplies.state_tax],
                    ['IGST',         gstr3b.outward_taxable_supplies.integrated_tax],
                  ] as [string, number][]).map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: MUTED, fontSize: 13 }}>{label}</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>₹{fmt(val)}</span>
                    </div>
                  ))}
                </div>

                {/* Tax payable card */}
                <div style={{ background: '#1a1a10', borderRadius: 12, padding: '16px', border: `1px solid ${AMBER}44`, marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: AMBER, fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>
                    TAX PAYABLE
                  </div>
                  {([
                    ['CGST', gstr3b.tax_payable.cgst],
                    ['SGST', gstr3b.tax_payable.sgst],
                    ['IGST', gstr3b.tax_payable.igst],
                  ] as [string, number][]).map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: MUTED, fontSize: 13 }}>{label}</span>
                      <span style={{ fontSize: 13 }}>₹{fmt(val)}</span>
                    </div>
                  ))}
                  <div style={{ height: 1, background: BORDER, margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>Total Tax</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: AMBER }}>₹{fmt(gstr3b.tax_payable.total)}</span>
                  </div>
                </div>

                {/* File button placeholder */}
                <button
                  style={{
                    width: '100%', background: 'transparent', color: AMBER,
                    border: `1px solid ${AMBER}`, borderRadius: 10, padding: '12px 0',
                    fontWeight: 700, fontSize: 14, cursor: 'default', opacity: 0.6,
                  }}
                >
                  File on GST Portal (Coming Soon)
                </button>
              </>
            )}

            {!gstr3b && !loading && !error && (
              <div style={{ color: GRAY, fontSize: 13, textAlign: 'center', padding: '32px 0' }}>
                Select a period and tap Load to view the summary
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
