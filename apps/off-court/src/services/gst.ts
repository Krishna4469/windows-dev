import { and, between, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { chartOfAccounts, journalEntries, journalLines } from '../db/schema.js';

interface SACEntry {
  sac: string;
  rate: number;
  label: string;
}

export const SAC_CODES: Record<string, SACEntry> = {
  'court-booking':      { sac: '999721', rate: 18, label: 'Court Booking' },
  'wellness-treatment': { sac: '999311', rate: 18, label: 'Wellness Treatment' },
  'cafe-food':          { sac: '996331', rate: 5,  label: 'Cafe Food' },
  'cafe-beverage':      { sac: '996331', rate: 18, label: 'Cafe Beverage' },
  'event-ticket':       { sac: '999691', rate: 18, label: 'Event Ticket' },
  'membership-credits': { sac: '999799', rate: 18, label: 'Membership Credits' },
  'co-working':         { sac: '997212', rate: 18, label: 'Co-working Space' },
  'kids-activity':      { sac: '999691', rate: 18, label: 'Kids Activity' },
};

const REF_TO_SERVICE: Record<string, string> = {
  booking:      'court-booking',
  'credit-load': 'membership-credits',
  'cafe-order':  'cafe-food',
};

export interface GSTResult {
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
  sacCode: string;
}

// Karnataka intra-state: CGST + SGST split, IGST = 0
export function calculateGST(amount: number, serviceType: string): GSTResult {
  const entry = SAC_CODES[serviceType];
  if (!entry) return { cgst: 0, sgst: 0, igst: 0, totalGST: 0, sacCode: '' };

  const totalGST = Math.round(amount * entry.rate) / 100;
  const cgst     = Math.round(totalGST * 50) / 100;
  const sgst     = Math.round((totalGST - cgst) * 100) / 100;

  return { cgst, sgst, igst: 0, totalGST, sacCode: entry.sac };
}

interface B2CItem {
  sac: string;
  service_type: string;
  taxable_value: number;
  rate: number;
  central_amount: number;
  state_amount: number;
  integrated_amount: number;
  total_gst: number;
}

async function fetchB2CItems(venueId: string, month: number, year: number): Promise<B2CItem[]> {
  const fromDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay  = new Date(year, month, 0).getDate();
  const toDate   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const entries = await db
    .select({ id: journalEntries.id, reference_type: journalEntries.reference_type })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.venue_id, venueId),
        between(journalEntries.entry_date, fromDate, toDate),
      ),
    );

  if (entries.length === 0) return [];

  const entryIds        = entries.map((e) => e.id);
  const refByEntryId    = new Map(entries.map((e) => [e.id, e.reference_type]));

  const lines = await db
    .select({ journal_id: journalLines.journal_id, account_id: journalLines.account_id, credit: journalLines.credit })
    .from(journalLines)
    .where(inArray(journalLines.journal_id, entryIds));

  const uniqueAcctIds = [...new Set(lines.map((l) => l.account_id))];
  const accounts = await db
    .select({ id: chartOfAccounts.id, account_type: chartOfAccounts.account_type })
    .from(chartOfAccounts)
    .where(inArray(chartOfAccounts.id, uniqueAcctIds));

  const acctTypeMap = new Map(accounts.map((a) => [a.id, a.account_type]));

  const agg: Record<string, { taxableValue: number; sacCode: string; rate: number }> = {};

  for (const line of lines) {
    if (acctTypeMap.get(line.account_id) !== 'revenue') continue;

    const refType     = refByEntryId.get(line.journal_id);
    const serviceType = refType ? REF_TO_SERVICE[refType] : undefined;
    if (!serviceType) continue;

    const sacEntry = SAC_CODES[serviceType];
    if (!sacEntry) continue;

    if (!agg[serviceType]) agg[serviceType] = { taxableValue: 0, sacCode: sacEntry.sac, rate: sacEntry.rate };
    agg[serviceType].taxableValue += parseFloat(line.credit);
  }

  return Object.entries(agg).map(([serviceType, g]) => {
    const gst = calculateGST(g.taxableValue, serviceType);
    return {
      sac:                serviceType,
      service_type:       serviceType,
      taxable_value:      Math.round(g.taxableValue * 100) / 100,
      rate:               g.rate,
      central_amount:     gst.cgst,
      state_amount:       gst.sgst,
      integrated_amount:  gst.igst,
      total_gst:          gst.totalGST,
    };
  });
}

export async function generateGSTR1(
  venueId: string,
  month: number,
  year: number,
): Promise<Record<string, unknown>> {
  const fp         = `${String(month).padStart(2, '0')}${year}`;
  const b2c_others = await fetchB2CItems(venueId, month, year);

  const totalTaxableValue = Math.round(b2c_others.reduce((s, i) => s + i.taxable_value, 0) * 100) / 100;
  const totalGST          = Math.round(b2c_others.reduce((s, i) => s + i.total_gst, 0) * 100) / 100;

  return {
    gstin: '29AAAAA0000A1Z5',
    fp,
    b2c_others,
    total_taxable_value: totalTaxableValue,
    total_gst:           totalGST,
  };
}

export async function generateGSTR3B(
  venueId: string,
  month: number,
  year: number,
): Promise<Record<string, unknown>> {
  const fp   = `${String(month).padStart(2, '0')}${year}`;
  const rows = await fetchB2CItems(venueId, month, year);

  const taxableValue = Math.round(rows.reduce((s, i) => s + i.taxable_value, 0) * 100) / 100;
  const cgst         = Math.round(rows.reduce((s, i) => s + i.central_amount, 0) * 100) / 100;
  const sgst         = Math.round(rows.reduce((s, i) => s + i.state_amount, 0) * 100) / 100;
  const igst         = Math.round(rows.reduce((s, i) => s + i.integrated_amount, 0) * 100) / 100;
  const total        = Math.round((cgst + sgst + igst) * 100) / 100;

  return {
    gstin: '29AAAAA0000A1Z5',
    fp,
    outward_taxable_supplies: { taxable_value: taxableValue, integrated_tax: igst, central_tax: cgst, state_tax: sgst },
    tax_payable:              { cgst, sgst, igst, total },
  };
}
