import { and, between, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { chartOfAccounts, journalEntries, journalLines } from '../db/schema.js';

type ReferenceType = 'booking' | 'credit-load' | 'cafe-order' | 'payroll' | 'expense';

interface EntryTemplate {
  debitCode: string;
  creditCode: string;
  description: string;
}

const ENTRY_TEMPLATES: Record<ReferenceType, EntryTemplate> = {
  booking:      { debitCode: 'AST-002', creditCode: 'REV-001', description: 'Court booking payment'   },
  'credit-load':{ debitCode: 'AST-001', creditCode: 'LIA-001', description: 'Member credit load'      },
  'cafe-order': { debitCode: 'AST-001', creditCode: 'REV-003', description: 'Cafe order payment'      },
  payroll:      { debitCode: 'EXP-001', creditCode: 'AST-001', description: 'Payroll disbursement'    },
  expense:      { debitCode: 'EXP-002', creditCode: 'AST-001', description: 'Expense payment'         },
};

export async function generateJournalEntry(
  referenceType: ReferenceType,
  referenceId: string | null,
  amount: number,
  venueId: string,
): Promise<void> {
  const template = ENTRY_TEMPLATES[referenceType];

  const accounts = await db
    .select()
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.venue_id, venueId),
        inArray(chartOfAccounts.account_code, [template.debitCode, template.creditCode]),
      ),
    );

  const debitAccount  = accounts.find((a) => a.account_code === template.debitCode);
  const creditAccount = accounts.find((a) => a.account_code === template.creditCode);

  if (!debitAccount || !creditAccount) return;

  const today = new Date().toISOString().slice(0, 10);

  const [entry] = await db
    .insert(journalEntries)
    .values({
      venue_id:       venueId,
      entry_date:     today,
      description:    template.description,
      reference_type: referenceType,
      reference_id:   referenceId ?? null,
      created_by:     venueId,
    })
    .returning();

  if (!entry) return;

  await db.insert(journalLines).values([
    { journal_id: entry.id, account_id: debitAccount.id,  debit: String(amount), credit: '0'            },
    { journal_id: entry.id, account_id: creditAccount.id, debit: '0',            credit: String(amount) },
  ]);
}

export interface PnLResult {
  revenue: Record<string, number>;
  expenses: Record<string, number>;
  netProfit: number;
}

export async function getPnL(
  venueId:  string,
  fromDate: string,
  toDate:   string,
): Promise<PnLResult> {
  const entries = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.venue_id, venueId),
        between(journalEntries.entry_date, fromDate, toDate),
      ),
    );

  if (entries.length === 0) return { revenue: {}, expenses: {}, netProfit: 0 };

  const entryIds = entries.map((e) => e.id);

  const lines = await db
    .select({
      account_id: journalLines.account_id,
      debit:      journalLines.debit,
      credit:     journalLines.credit,
    })
    .from(journalLines)
    .where(inArray(journalLines.journal_id, entryIds));

  if (lines.length === 0) return { revenue: {}, expenses: {}, netProfit: 0 };

  const uniqueAccountIds = [...new Set(lines.map((l) => l.account_id))];

  const accounts = await db
    .select({ id: chartOfAccounts.id, account_name: chartOfAccounts.account_name, account_type: chartOfAccounts.account_type })
    .from(chartOfAccounts)
    .where(inArray(chartOfAccounts.id, uniqueAccountIds));

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const revenue:  Record<string, number> = {};
  const expenses: Record<string, number> = {};

  for (const line of lines) {
    const account = accountMap.get(line.account_id);
    if (!account) continue;

    if (account.account_type === 'revenue') {
      const net = parseFloat(line.credit) - parseFloat(line.debit);
      revenue[account.account_name] = (revenue[account.account_name] ?? 0) + net;
    } else if (account.account_type === 'expense') {
      const net = parseFloat(line.debit) - parseFloat(line.credit);
      expenses[account.account_name] = (expenses[account.account_name] ?? 0) + net;
    }
  }

  const totalRevenue  = Object.values(revenue).reduce((s, v) => s + v, 0);
  const totalExpenses = Object.values(expenses).reduce((s, v) => s + v, 0);

  return { revenue, expenses, netProfit: totalRevenue - totalExpenses };
}
