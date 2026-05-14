import { Router, type Request, type Response } from 'express';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { staffMembers, attendanceRecords, payrollRuns } from '../db/schema.js';
import { generatePayrollRun, generateBankFile } from '../services/payroll.js';

const router = Router();

// GET /api/payroll/staff?venue_id=
router.get('/staff', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;
  if (typeof venue_id !== 'string') {
    res.status(400).json({ error: 'venue_id query param required' });
    return;
  }
  const rows = await db
    .select()
    .from(staffMembers)
    .where(eq(staffMembers.venue_id, venue_id))
    .orderBy(staffMembers.name);
  res.json(rows);
});

// POST /api/payroll/staff
router.post('/staff', async (req: Request, res: Response): Promise<void> => {
  const {
    venue_id, name, phone, role, base_salary_inr,
    pf_applicable, esic_applicable, bank_account, ifsc_code, joined_at,
  } = req.body as {
    venue_id?: unknown;
    name?: unknown;
    phone?: unknown;
    role?: unknown;
    base_salary_inr?: unknown;
    pf_applicable?: unknown;
    esic_applicable?: unknown;
    bank_account?: unknown;
    ifsc_code?: unknown;
    joined_at?: unknown;
  };

  if (
    typeof venue_id         !== 'string' ||
    typeof name             !== 'string' ||
    typeof phone            !== 'string' ||
    typeof role             !== 'string' ||
    typeof base_salary_inr !== 'number' ||
    typeof joined_at        !== 'string'
  ) {
    res.status(400).json({ error: 'venue_id, name, phone, role, base_salary_inr, joined_at are required' });
    return;
  }

  const [row] = await db
    .insert(staffMembers)
    .values({
      venue_id,
      name,
      phone,
      role,
      base_salary_inr: String(base_salary_inr),
      pf_applicable:   typeof pf_applicable  === 'boolean' ? pf_applicable  : true,
      esic_applicable: typeof esic_applicable === 'boolean' ? esic_applicable : false,
      bank_account:    typeof bank_account === 'string' ? bank_account : null,
      ifsc_code:       typeof ifsc_code    === 'string' ? ifsc_code    : null,
      joined_at,
    })
    .returning();

  res.status(201).json(row);
});

// POST /api/payroll/attendance
router.post('/attendance', async (req: Request, res: Response): Promise<void> => {
  const { staff_id, date, check_in, check_out, hours_worked, status } = req.body as {
    staff_id?: unknown;
    date?: unknown;
    check_in?: unknown;
    check_out?: unknown;
    hours_worked?: unknown;
    status?: unknown;
  };

  if (typeof staff_id !== 'string' || typeof date !== 'string') {
    res.status(400).json({ error: 'staff_id and date are required' });
    return;
  }

  const VALID_STATUS = ['present', 'absent', 'half-day', 'leave'] as const;
  const resolvedStatus =
    typeof status === 'string' && (VALID_STATUS as readonly string[]).includes(status)
      ? status
      : 'present';

  const [row] = await db
    .insert(attendanceRecords)
    .values({
      staff_id,
      date,
      check_in:     typeof check_in    === 'string' ? new Date(check_in)    : null,
      check_out:    typeof check_out   === 'string' ? new Date(check_out)   : null,
      hours_worked: typeof hours_worked === 'number' ? String(hours_worked) : '0',
      status:       resolvedStatus,
    })
    .returning();

  res.status(201).json(row);
});

// GET /api/payroll/attendance?staff_id=&date=
router.get('/attendance', async (req: Request, res: Response): Promise<void> => {
  const { staff_id, date } = req.query;

  const rows = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        typeof staff_id === 'string' ? eq(attendanceRecords.staff_id, staff_id) : undefined,
        typeof date     === 'string' ? eq(attendanceRecords.date, date)          : undefined,
      ),
    )
    .orderBy(desc(attendanceRecords.date));

  res.json(rows);
});

// POST /api/payroll/runs
router.post('/runs', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, month, year } = req.body as {
    venue_id?: unknown;
    month?: unknown;
    year?: unknown;
  };

  if (typeof venue_id !== 'string' || typeof month !== 'number' || typeof year !== 'number') {
    res.status(400).json({ error: 'venue_id, month (number), year (number) are required' });
    return;
  }
  if (month < 1 || month > 12) {
    res.status(400).json({ error: 'month must be 1-12' });
    return;
  }

  const runId = await generatePayrollRun(venue_id, month, year);
  res.status(201).json({ payroll_run_id: runId });
});

// GET /api/payroll/runs?venue_id=
router.get('/runs', async (req: Request, res: Response): Promise<void> => {
  const { venue_id } = req.query;
  if (typeof venue_id !== 'string') {
    res.status(400).json({ error: 'venue_id query param required' });
    return;
  }
  const rows = await db
    .select()
    .from(payrollRuns)
    .where(eq(payrollRuns.venue_id, venue_id))
    .orderBy(desc(payrollRuns.created_at));
  res.json(rows);
});

// GET /api/payroll/runs/:id/bank-file
router.get('/runs/:id/bank-file', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params as { id: string };
  const csv = await generateBankFile(id);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="payroll-${id}.csv"`);
  res.send(csv);
});

// GET /api/payroll/attendance-summary?venue_id=&date=
router.get('/attendance-summary', async (req: Request, res: Response): Promise<void> => {
  const { venue_id, date } = req.query;
  if (typeof venue_id !== 'string') {
    res.status(400).json({ error: 'venue_id query param required' });
    return;
  }

  const staff = await db
    .select({ id: staffMembers.id })
    .from(staffMembers)
    .where(and(eq(staffMembers.venue_id, venue_id), eq(staffMembers.status, 'active')));

  if (staff.length === 0) {
    res.json({ present: 0, absent: 0, total: 0 });
    return;
  }

  const staffIds   = staff.map((s) => s.id);
  const targetDate = typeof date === 'string' ? date : new Date().toISOString().slice(0, 10);

  const records = await db
    .select({ status: attendanceRecords.status })
    .from(attendanceRecords)
    .where(and(inArray(attendanceRecords.staff_id, staffIds), eq(attendanceRecords.date, targetDate)));

  const present = records.filter((r) => r.status === 'present' || r.status === 'half-day').length;
  const absent  = records.filter((r) => r.status === 'absent').length;

  res.json({ present, absent, total: staff.length });
});

export default router;
