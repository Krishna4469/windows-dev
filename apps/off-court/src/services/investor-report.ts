import { and, between, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  chartOfAccounts,
  journalEntries,
  journalLines,
  payrollRuns,
  venueMetrics,
} from '../db/schema.js';
import { getPnL } from './accounting.js';
import { generateGSTR3B } from './gst.js';

export async function generateInvestorReport(
  venueId: string,
  month: number,
  year: number,
): Promise<Record<string, unknown>> {
  const mm      = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const fromDate = `${year}-${mm}-01`;
  const toDate   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

  // P&L summary from accounting service
  const pnl = await getPnL(venueId, fromDate, toDate);
  const totalRevenue  = Object.values(pnl.revenue).reduce((s, v) => s + v, 0);
  const totalExpenses = Object.values(pnl.expenses).reduce((s, v) => s + v, 0);

  // Payroll total from payroll_runs
  const [payrollRun] = await db
    .select()
    .from(payrollRuns)
    .where(
      and(
        eq(payrollRuns.venue_id, venueId),
        eq(payrollRuns.month, month),
        eq(payrollRuns.year, year),
      ),
    )
    .limit(1);

  const payrollTotal = payrollRun ? parseFloat(String(payrollRun.total_net_inr)) : 0;

  // Current month member metrics
  const [currentMetric] = await db
    .select()
    .from(venueMetrics)
    .where(
      and(
        eq(venueMetrics.venue_id, venueId),
        between(venueMetrics.metric_date, fromDate, toDate),
      ),
    )
    .orderBy(desc(venueMetrics.metric_date))
    .limit(1);

  // Previous month for growth calculation
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear  = month === 1 ? year - 1 : year;
  const prevMm      = String(prevMonth).padStart(2, '0');
  const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
  const prevFromDate = `${prevYear}-${prevMm}-01`;
  const prevToDate   = `${prevYear}-${prevMm}-${String(prevLastDay).padStart(2, '0')}`;

  const [prevMetric] = await db
    .select()
    .from(venueMetrics)
    .where(
      and(
        eq(venueMetrics.venue_id, venueId),
        between(venueMetrics.metric_date, prevFromDate, prevToDate),
      ),
    )
    .orderBy(desc(venueMetrics.metric_date))
    .limit(1);

  const currentTotal  = currentMetric?.total_members  ?? 0;
  const currentActive = currentMetric?.active_members ?? 0;
  const prevTotal     = prevMetric?.total_members     ?? 0;
  const prevActive    = prevMetric?.active_members    ?? 0;
  const newThisMonth  = Math.max(0, currentTotal - prevTotal);
  const churnCount    = Math.max(0, prevActive - currentActive);
  const courtUtil     = currentMetric
    ? parseFloat(String(currentMetric.court_utilisation_pct))
    : 0;

  // GST liability via GSTR-3B
  const gstr3b    = await generateGSTR3B(venueId, month, year);
  const taxPayable = gstr3b.tax_payable as {
    cgst: number; sgst: number; igst: number; total: number;
  };

  // Top 3 revenue sources from journal lines
  let topRevenueSources: Array<{ source: string; amount: number }> = [];

  const entries = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(
      and(
        eq(journalEntries.venue_id, venueId),
        between(journalEntries.entry_date, fromDate, toDate),
      ),
    );

  if (entries.length > 0) {
    const entryIds = entries.map((e) => e.id);
    const lines    = await db
      .select({ account_id: journalLines.account_id, credit: journalLines.credit })
      .from(journalLines)
      .where(inArray(journalLines.journal_id, entryIds));

    const uniqueIds = [...new Set(lines.map((l) => l.account_id))];

    if (uniqueIds.length > 0) {
      const accounts = await db
        .select({
          id:           chartOfAccounts.id,
          account_name: chartOfAccounts.account_name,
          account_type: chartOfAccounts.account_type,
        })
        .from(chartOfAccounts)
        .where(inArray(chartOfAccounts.id, uniqueIds));

      const accountMap    = new Map(accounts.map((a) => [a.id, a]));
      const revBySource: Record<string, number> = {};

      for (const line of lines) {
        const acct = accountMap.get(line.account_id);
        if (!acct || acct.account_type !== 'revenue') continue;
        revBySource[acct.account_name] =
          (revBySource[acct.account_name] ?? 0) + parseFloat(String(line.credit));
      }

      topRevenueSources = Object.entries(revBySource)
        .map(([source, amount]) => ({ source, amount: Math.round(amount * 100) / 100 }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);
    }
  }

  return {
    venue_id: venueId,
    period: { month, year, from_date: fromDate, to_date: toDate },
    financial_performance: {
      revenue:        pnl.revenue,
      total_revenue:  Math.round(totalRevenue  * 100) / 100,
      expenses:       pnl.expenses,
      total_expenses: Math.round(totalExpenses * 100) / 100,
      net_profit:     Math.round(pnl.netProfit * 100) / 100,
    },
    member_metrics: {
      total_members:  currentTotal,
      new_this_month: newThisMonth,
      churn_count:    churnCount,
      active_members: currentActive,
    },
    operational_kpis: {
      court_utilisation_pct: courtUtil,
      payroll_total:         payrollTotal,
    },
    compliance_status: {
      gst_liability: {
        cgst:  taxPayable?.cgst  ?? 0,
        sgst:  taxPayable?.sgst  ?? 0,
        igst:  taxPayable?.igst  ?? 0,
        total: taxPayable?.total ?? 0,
      },
    },
    top_revenue_sources: topRevenueSources,
    generated_at: new Date().toISOString(),
  };
}

export function formatInvestorReportText(report: Record<string, unknown>): string {
  const period = report.period as {
    month: number; year: number; from_date: string; to_date: string;
  };
  const fin = report.financial_performance as {
    revenue: Record<string, number>;
    total_revenue: number;
    expenses: Record<string, number>;
    total_expenses: number;
    net_profit: number;
  };
  const member = report.member_metrics as {
    total_members: number; new_this_month: number;
    churn_count: number; active_members: number;
  };
  const ops = report.operational_kpis as {
    court_utilisation_pct: number; payroll_total: number;
  };
  const compliance = report.compliance_status as {
    gst_liability: { cgst: number; sgst: number; igst: number; total: number };
  };
  const topSources = report.top_revenue_sources as Array<{ source: string; amount: number }>;

  const MONTHS = [
    '', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
  const out: string[] = [];

  out.push(`INVESTOR REPORT — ${MONTHS[period.month]} ${period.year}`);
  out.push(`Period: ${period.from_date} to ${period.to_date}`);
  out.push('');

  out.push('═══ FINANCIAL PERFORMANCE ═══');
  for (const [src, amt] of Object.entries(fin.revenue)) {
    out.push(`  Revenue  — ${src}: ${fmt(amt)}`);
  }
  out.push(`  Total Revenue:    ${fmt(fin.total_revenue)}`);
  for (const [cat, amt] of Object.entries(fin.expenses)) {
    out.push(`  Expense  — ${cat}: ${fmt(amt)}`);
  }
  out.push(`  Total Expenses:   ${fmt(fin.total_expenses)}`);
  out.push(`  Net Profit:       ${fmt(fin.net_profit)}`);
  out.push('');

  out.push('═══ MEMBER METRICS ═══');
  out.push(`  Total Members:    ${member.total_members}`);
  out.push(`  Active Members:   ${member.active_members}`);
  out.push(`  New This Month:   ${member.new_this_month}`);
  out.push(`  Churn Count:      ${member.churn_count}`);
  out.push('');

  out.push('═══ OPERATIONAL KPIs ═══');
  out.push(`  Court Utilisation: ${ops.court_utilisation_pct}%`);
  out.push(`  Payroll Total:     ${fmt(ops.payroll_total)}`);
  out.push('');

  out.push('═══ COMPLIANCE STATUS ═══');
  out.push(`  GST — CGST: ${fmt(compliance.gst_liability.cgst)}`);
  out.push(`  GST — SGST: ${fmt(compliance.gst_liability.sgst)}`);
  out.push(`  GST — IGST: ${fmt(compliance.gst_liability.igst)}`);
  out.push(`  GST Total:  ${fmt(compliance.gst_liability.total)}`);
  out.push('');

  if (topSources.length > 0) {
    out.push('═══ TOP REVENUE SOURCES ═══');
    topSources.forEach((s, i) => {
      out.push(`  #${i + 1} ${s.source}: ${fmt(s.amount)}`);
    });
    out.push('');
  }

  out.push(`Generated: ${report.generated_at as string}`);
  return out.join('\n');
}
