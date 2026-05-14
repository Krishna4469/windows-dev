import { db } from './client.js';
import { chartOfAccounts } from './schema.js';

const VENUE_ID = process.env['SEED_VENUE_ID'] ?? '00000000-0000-0000-0000-000000000001';

const ACCOUNTS = [
  { account_code: 'REV-001', account_name: 'Court Revenue',       account_type: 'revenue'   },
  { account_code: 'REV-002', account_name: 'Wellness Revenue',    account_type: 'revenue'   },
  { account_code: 'REV-003', account_name: 'Cafe Revenue',        account_type: 'revenue'   },
  { account_code: 'REV-004', account_name: 'Membership Credits',  account_type: 'revenue'   },
  { account_code: 'REV-005', account_name: 'Sponsorship Revenue', account_type: 'revenue'   },
  { account_code: 'REV-006', account_name: 'Event Revenue',       account_type: 'revenue'   },
  { account_code: 'EXP-001', account_name: 'Staff Salaries',      account_type: 'expense'   },
  { account_code: 'EXP-002', account_name: 'Court Maintenance',   account_type: 'expense'   },
  { account_code: 'EXP-003', account_name: 'Utilities',           account_type: 'expense'   },
  { account_code: 'EXP-004', account_name: 'Marketing',           account_type: 'expense'   },
  { account_code: 'EXP-005', account_name: 'F&B Cost',            account_type: 'expense'   },
  { account_code: 'EXP-006', account_name: 'Insurance',           account_type: 'expense'   },
  { account_code: 'AST-001', account_name: 'Cash',                account_type: 'asset'     },
  { account_code: 'AST-002', account_name: 'Credits Receivable',  account_type: 'asset'     },
  { account_code: 'AST-003', account_name: 'Equipment',           account_type: 'asset'     },
  { account_code: 'LIA-001', account_name: 'Deferred Credits',    account_type: 'liability' },
  { account_code: 'LIA-002', account_name: 'GST Payable',         account_type: 'liability' },
] as const;

async function seedAccounts(): Promise<void> {
  for (const acct of ACCOUNTS) {
    await db
      .insert(chartOfAccounts)
      .values({ venue_id: VENUE_ID, ...acct, is_system: true })
      .onConflictDoNothing();
  }
  console.log(`Seeded ${ACCOUNTS.length} chart-of-accounts entries for venue ${VENUE_ID}`);
}

seedAccounts().catch(console.error);
