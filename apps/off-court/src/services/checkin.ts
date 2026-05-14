import crypto from 'crypto';
import { db } from '../db/client.js';
import { checkinEvents, bleDevices, members } from '../db/schema.js';
import { eq, and, isNull, desc } from 'drizzle-orm';

export async function processCheckin(
  memberId: string,
  venueId: string,
  method: string,
  deviceId?: string,
  locationLabel?: string,
): Promise<{ checkinId: string; memberName: string; creditsBalance: number }> {
  const [member] = await db
    .select({ name: members.name, credit_balance: members.credit_balance })
    .from(members)
    .where(eq(members.id, memberId))
    .limit(1);

  if (!member) throw new Error('Member not found');

  const [inserted] = await db
    .insert(checkinEvents)
    .values({
      venue_id: venueId,
      member_id: memberId,
      checkin_method: method,
      device_id: deviceId ?? null,
      location_label: locationLabel ?? null,
    })
    .returning({ id: checkinEvents.id });

  if (!inserted) throw new Error('Failed to create checkin event');

  return {
    checkinId: inserted.id,
    memberName: member.name,
    creditsBalance: Number(member.credit_balance),
  };
}

export async function processCheckout(memberId: string, venueId: string): Promise<void> {
  const [open] = await db
    .select({ id: checkinEvents.id })
    .from(checkinEvents)
    .where(
      and(
        eq(checkinEvents.member_id, memberId),
        eq(checkinEvents.venue_id, venueId),
        isNull(checkinEvents.checked_out_at),
      ),
    )
    .orderBy(desc(checkinEvents.checked_in_at))
    .limit(1);

  if (!open) throw new Error('No open checkin found');

  await db
    .update(checkinEvents)
    .set({ checked_out_at: new Date() })
    .where(eq(checkinEvents.id, open.id));
}

export async function detectBLECheckin(macAddress: string, venueId: string): Promise<string | null> {
  const [device] = await db
    .select({ zone: bleDevices.zone })
    .from(bleDevices)
    .where(
      and(
        eq(bleDevices.mac_address, macAddress),
        eq(bleDevices.venue_id, venueId),
        eq(bleDevices.status, 'active'),
      ),
    )
    .limit(1);

  return device?.zone ?? null;
}

export function generateQRCode(memberId: string): string {
  const secret = process.env['QR_HMAC_SECRET'] ?? 'off-court-qr-secret';
  const payload = JSON.stringify({ memberId, ts: Date.now() });
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const combined = JSON.stringify({ payload, sig });
  return Buffer.from(combined).toString('base64');
}
