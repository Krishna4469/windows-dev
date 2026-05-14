import { and, eq, gte, lte } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  staffMembers,
  attendanceRecords,
  payrollRuns,
  payrollLineItems,
} from '../db/schema.js';

export interface PayrollCalcResult {
  gross: number;
  pfDeduction: number;
  esicDeduction: number;
  tdsDeduction: number;
  net: number;
}

interface PayrollDetail extends PayrollCalcResult {
  daysWorked: number;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

async function computePayrollDetail(
  staffId: string,
  month: number,
  year: number,
): Promise<PayrollDetail> {
  const [staff] = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.id, staffId))
    .limit(1);

  if (!staff) throw new Error(`Staff ${staffId} not found`);

  const mm       = String(month).padStart(2, '0');
  const totalDays = daysInMonth(month, year);
  const firstDay  = `${year}-${mm}-01`;
  const lastDay   = `${year}-${mm}-${String(totalDays).padStart(2, '0')}`;

  const records = await db
    .select({ status: attendanceRecords.status })
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.staff_id, staffId),
        gte(attendanceRecords.date, firstDay),
        lte(attendanceRecords.date, lastDay),
      ),
    );

  let daysWorked = 0;
  for (const r of records) {
    if (r.status === 'present')    daysWorked += 1;
    else if (r.status === 'half-day') daysWorked += 0.5;
  }

  const baseSalary = parseFloat(staff.base_salary_inr);
  const gross      = parseFloat(((baseSalary * daysWorked) / totalDays).toFixed(2));

  const pfDeduction   = staff.pf_applicable
    ? parseFloat((gross * 0.12).toFixed(2))
    : 0;
  const esicDeduction = staff.esic_applicable && gross < 21000
    ? parseFloat((gross * 0.0075).toFixed(2))
    : 0;
  const tdsDeduction  = gross > 50000
    ? parseFloat((gross * 0.10).toFixed(2))
    : 0;
  const net = parseFloat((gross - pfDeduction - esicDeduction - tdsDeduction).toFixed(2));

  return { gross, pfDeduction, esicDeduction, tdsDeduction, net, daysWorked };
}

export async function calculatePayroll(
  staffId: string,
  month: number,
  year: number,
): Promise<PayrollCalcResult> {
  const detail = await computePayrollDetail(staffId, month, year);
  return {
    gross:          detail.gross,
    pfDeduction:    detail.pfDeduction,
    esicDeduction:  detail.esicDeduction,
    tdsDeduction:   detail.tdsDeduction,
    net:            detail.net,
  };
}

export async function generatePayrollRun(
  venueId: string,
  month: number,
  year: number,
): Promise<string> {
  const activeStaff = await db
    .select()
    .from(staffMembers)
    .where(and(eq(staffMembers.venue_id, venueId), eq(staffMembers.status, 'active')));

  const calcs = await Promise.all(
    activeStaff.map(async (s) => ({
      staff:  s,
      detail: await computePayrollDetail(s.id, month, year),
    })),
  );

  const totalGross = parseFloat(
    calcs.reduce((sum, { detail }) => sum + detail.gross, 0).toFixed(2),
  );
  const totalDeductions = parseFloat(
    calcs
      .reduce(
        (sum, { detail }) =>
          sum + detail.pfDeduction + detail.esicDeduction + detail.tdsDeduction,
        0,
      )
      .toFixed(2),
  );
  const totalNet = parseFloat(
    calcs.reduce((sum, { detail }) => sum + detail.net, 0).toFixed(2),
  );

  const [run] = await db
    .insert(payrollRuns)
    .values({
      venue_id:             venueId,
      month,
      year,
      status:               'draft',
      total_gross_inr:      String(totalGross),
      total_deductions_inr: String(totalDeductions),
      total_net_inr:        String(totalNet),
    })
    .returning();

  if (!run) throw new Error('Failed to create payroll run');

  if (calcs.length > 0) {
    await db.insert(payrollLineItems).values(
      calcs.map(({ staff, detail }) => ({
        payroll_run_id: run.id,
        staff_id:       staff.id,
        days_worked:    Math.round(detail.daysWorked),
        gross_salary:   String(detail.gross),
        pf_deduction:   String(detail.pfDeduction),
        esic_deduction: String(detail.esicDeduction),
        tds_deduction:  String(detail.tdsDeduction),
        net_salary:     String(detail.net),
        bank_account:   staff.bank_account ?? '',
        ifsc_code:      staff.ifsc_code    ?? '',
      })),
    );
  }

  return run.id;
}

export async function generateBankFile(payrollRunId: string): Promise<string> {
  const items = await db
    .select({
      name:         staffMembers.name,
      bank_account: payrollLineItems.bank_account,
      ifsc_code:    payrollLineItems.ifsc_code,
      net_salary:   payrollLineItems.net_salary,
    })
    .from(payrollLineItems)
    .innerJoin(staffMembers, eq(payrollLineItems.staff_id, staffMembers.id))
    .where(eq(payrollLineItems.payroll_run_id, payrollRunId));

  const lines = ['name,bank_account,ifsc_code,net_amount'];
  for (const item of items) {
    const safeName = `"${item.name.replace(/"/g, '""')}"`;
    lines.push(`${safeName},${item.bank_account},${item.ifsc_code},${item.net_salary}`);
  }
  return lines.join('\n');
}
