import crypto from 'crypto';
import { db } from '../db/client.js';
import { otpRequests, authSessions, members } from '../db/schema.js';
import { eq, and, gt, desc } from 'drizzle-orm';

export async function sendOTP(phone: string): Promise<void> {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(otpRequests).values({ phone, otp_code: otp, expires_at: expiresAt });

  const authkey = process.env['MSG91_AUTH_KEY'] ?? '';
  const templateId = process.env['MSG91_OTP_TEMPLATE_ID'] ?? '';

  const url = new URL('https://api.msg91.com/api/v5/otp');
  url.searchParams.set('template_id', templateId);
  url.searchParams.set('mobile', phone);
  url.searchParams.set('authkey', authkey);
  url.searchParams.set('otp', otp);

  const res = await fetch(url.toString(), { method: 'POST' });
  if (!res.ok) {
    throw new Error(`MSG91 error: ${res.status}`);
  }
}

export async function verifyOTP(
  phone: string,
  otp: string,
): Promise<{ token: string; memberId: string } | null> {
  const now = new Date();

  const [request] = await db
    .select()
    .from(otpRequests)
    .where(
      and(
        eq(otpRequests.phone, phone),
        eq(otpRequests.otp_code, otp),
        eq(otpRequests.verified, false),
        gt(otpRequests.expires_at, now),
      ),
    )
    .orderBy(desc(otpRequests.created_at))
    .limit(1);

  if (!request) return null;

  await db.update(otpRequests).set({ verified: true }).where(eq(otpRequests.id, request.id));

  const existing = await db.select().from(members).where(eq(members.phone, phone)).limit(1);
  let memberId: string;

  const existingMember = existing[0];
  if (existingMember) {
    memberId = existingMember.id;
  } else {
    const inserted = await db
      .insert(members)
      .values({
        venue_id: process.env['DEFAULT_VENUE_ID'] ?? crypto.randomUUID(),
        phone,
        name: phone,
      })
      .returning({ id: members.id });
    const newMember = inserted[0];
    if (!newMember) throw new Error('Failed to create member');
    memberId = newMember.id;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(authSessions).values({ member_id: memberId, token, expires_at: expiresAt });

  return { token, memberId };
}

export async function validateSession(token: string): Promise<string | null> {
  const now = new Date();

  const [session] = await db
    .select({ member_id: authSessions.member_id })
    .from(authSessions)
    .where(and(eq(authSessions.token, token), gt(authSessions.expires_at, now)))
    .limit(1);

  return session?.member_id ?? null;
}
