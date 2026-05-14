import crypto from 'crypto';
import { db } from '../db/client.js';
import { authSessions, members } from '../db/schema.js';
import { eq } from 'drizzle-orm';

async function upsertMember(email: string, name: string, placeholderPhone: string): Promise<string> {
  if (email) {
    const [existing] = await db
      .select({ id: members.id })
      .from(members)
      .where(eq(members.email, email))
      .limit(1);
    if (existing) return existing.id;
  }

  const [inserted] = await db
    .insert(members)
    .values({
      venue_id: process.env['DEFAULT_VENUE_ID'] ?? crypto.randomUUID(),
      phone: placeholderPhone,
      name: name || email,
      email,
    })
    .returning({ id: members.id });

  if (!inserted) throw new Error('Failed to create member');
  return inserted.id;
}

async function issueSession(memberId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await db.insert(authSessions).values({ member_id: memberId, token, expires_at: expiresAt });
  return token;
}

export async function handleGoogleCallback(
  googleId: string,
  email: string,
  name: string,
): Promise<{ token: string; memberId: string }> {
  // phone must be ≤32 chars and unique; prefix + first 30 chars of stable Google ID
  const phone = `g:${googleId.slice(0, 30)}`;
  const memberId = await upsertMember(email, name, phone);
  const token = await issueSession(memberId);
  return { token, memberId };
}

export async function handleMicrosoftCallback(
  microsoftId: string,
  email: string,
  name: string,
): Promise<{ token: string; memberId: string }> {
  // Azure AD OIDs are GUIDs (36 chars with dashes); strip dashes then take 30
  const phone = `m:${microsoftId.replace(/-/g, '').slice(0, 30)}`;
  const memberId = await upsertMember(email, name, phone);
  const token = await issueSession(memberId);
  return { token, memberId };
}
