import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { members, marketingCampaigns, campaignLogs } from '../db/schema.js';
import { sendWelcomeMember } from './whatsapp-templates.js';
import { sendTextMessage } from './whatsapp-send.js';

const SYSTEM_ACTOR = '00000000-0000-0000-0000-000000000001';

export async function triggerBirthdayCampaign(venueId: string): Promise<void> {
  const birthdayMembers = await db
    .select({ id: members.id, phone: members.phone, name: members.name })
    .from(members)
    .where(
      and(
        eq(members.venue_id, venueId),
        sql`date_part('month', ${members.created_at}) = date_part('month', current_timestamp)`,
        sql`date_part('day', ${members.created_at}) = date_part('day', current_timestamp)`,
      ),
    );

  if (birthdayMembers.length === 0) return;

  const [campaign] = await db
    .insert(marketingCampaigns)
    .values({
      venue_id: venueId,
      campaign_name: `Birthday Campaign ${new Date().toISOString().slice(0, 10)}`,
      channel: 'whatsapp',
      campaign_type: 'birthday',
      status: 'running',
      message_template: 'welcome_member',
      target_count: birthdayMembers.length,
      created_by: SYSTEM_ACTOR,
    })
    .returning();

  if (!campaign) return;

  for (const member of birthdayMembers) {
    let status = 'sent';
    let errorMessage: string | null = null;
    try {
      await sendWelcomeMember(member.phone, member.name);
    } catch (err) {
      status = 'failed';
      errorMessage = err instanceof Error ? err.message : String(err);
    }
    await db.insert(campaignLogs).values({
      campaign_id: campaign.id,
      member_id: member.id,
      status,
      sent_at: new Date(),
      error_message: errorMessage,
    });
  }

  const sentCount = birthdayMembers.filter((_, i) => i >= 0).length;
  await db
    .update(marketingCampaigns)
    .set({ status: 'completed', sent_count: sentCount })
    .where(eq(marketingCampaigns.id, campaign.id));
}

export async function triggerWinBackCampaign(venueId: string): Promise<void> {
  const atRiskMembers = await db
    .select({ id: members.id, phone: members.phone, name: members.name })
    .from(members)
    .where(
      and(
        eq(members.venue_id, venueId),
        eq(members.segment, 'at-risk'),
        gt(members.days_since_last_visit, 21),
      ),
    );

  if (atRiskMembers.length === 0) return;

  const [campaign] = await db
    .insert(marketingCampaigns)
    .values({
      venue_id: venueId,
      campaign_name: `Win-Back Campaign ${new Date().toISOString().slice(0, 10)}`,
      channel: 'whatsapp',
      campaign_type: 'win-back',
      status: 'running',
      message_template: 'text',
      target_count: atRiskMembers.length,
      created_by: SYSTEM_ACTOR,
    })
    .returning();

  if (!campaign) return;

  for (const member of atRiskMembers) {
    const firstName = member.name.split(' ')[0] ?? member.name;
    const message =
      `Hey ${firstName}! We've been missing you on the court. ` +
      `It's been a while since your last game — come back and rediscover your rhythm. ` +
      `Your spot is waiting! Reply BOOK to schedule your next session.`;

    let status = 'sent';
    let errorMessage: string | null = null;
    try {
      await sendTextMessage(member.phone, message);
    } catch (err) {
      status = 'failed';
      errorMessage = err instanceof Error ? err.message : String(err);
    }
    await db.insert(campaignLogs).values({
      campaign_id: campaign.id,
      member_id: member.id,
      status,
      sent_at: new Date(),
      error_message: errorMessage,
    });
  }

  await db
    .update(marketingCampaigns)
    .set({ status: 'completed', sent_count: atRiskMembers.length })
    .where(eq(marketingCampaigns.id, campaign.id));
}

export async function triggerWelcomeCampaign(
  _memberId: string,
  phone: string,
  name: string,
): Promise<void> {
  await sendWelcomeMember(phone, name);
}

export function scheduleDailyCampaigns(venueId: string): void {
  triggerBirthdayCampaign(venueId)
    .then(() => triggerWinBackCampaign(venueId))
    .catch((err: unknown) => {
      console.error('[auto-campaigns] daily run failed', venueId, err);
    });
}
