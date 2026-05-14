import Anthropic from '@anthropic-ai/sdk';
import { db } from '../db/client.js';
import { members, events } from '../db/schema.js';
import { and, count, eq, gt, lt } from 'drizzle-orm';

const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

interface CampaignSuggestion {
  campaignType: string;
  segment: string;
  reasoning: string;
  suggestedMessage: string;
}

interface VenueContext {
  totalMembers: number;
  activeCount: number;
  atRiskCount: number;
  upcomingEventsCount: number;
}

async function getVenueContext(venueId: string): Promise<VenueContext> {
  const now = new Date();
  const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [[totalRow], [activeRow], [atRiskRow], [eventsRow]] = await Promise.all([
    db
      .select({ c: count() })
      .from(members)
      .where(eq(members.venue_id, venueId)),
    db
      .select({ c: count() })
      .from(members)
      .where(and(eq(members.venue_id, venueId), eq(members.segment, 'active'))),
    db
      .select({ c: count() })
      .from(members)
      .where(and(eq(members.venue_id, venueId), eq(members.segment, 'at-risk'))),
    db
      .select({ c: count() })
      .from(events)
      .where(
        and(
          eq(events.venue_id, venueId),
          gt(events.scheduled_at, now),
          lt(events.scheduled_at, thirtyDaysOut),
          eq(events.status, 'upcoming'),
        ),
      ),
  ]);

  return {
    totalMembers: Number(totalRow?.c ?? 0),
    activeCount: Number(activeRow?.c ?? 0),
    atRiskCount: Number(atRiskRow?.c ?? 0),
    upcomingEventsCount: Number(eventsRow?.c ?? 0),
  };
}

export async function suggestCampaigns(venueId: string): Promise<CampaignSuggestion[]> {
  const ctx = await getVenueContext(venueId);

  const prompt = `You are a sports venue marketing expert. Based on the following venue data, suggest exactly 3 targeted marketing campaigns.

Venue data:
- Total members: ${ctx.totalMembers}
- Active members: ${ctx.activeCount}
- At-risk members (haven't visited recently): ${ctx.atRiskCount}
- Upcoming events in next 30 days: ${ctx.upcomingEventsCount}

Available campaign types: welcome, birthday, win-back, event-promo, achievement, seasonal
Available segments: new, active, at-risk, lapsed, vip, corporate

Respond with a JSON array of exactly 3 objects. Each object must have these fields:
- campaignType: one of the available campaign types
- segment: one of the available segments
- reasoning: one sentence explaining why this campaign makes sense now
- suggestedMessage: a short WhatsApp-friendly message (under 100 words) for this campaign

Return only the JSON array, no markdown, no explanation.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  const raw = block?.type === 'text' ? block.text.trim() : '[]';

  return JSON.parse(raw) as CampaignSuggestion[];
}

export async function refineCampaignMessage(
  draft: string,
  segment: string,
  tone: string,
): Promise<string> {
  const prompt = `You are a sports venue marketing copywriter. Refine the following campaign message for the target segment.

Draft message:
${draft}

Target segment: ${segment}
Desired tone: ${tone}

Requirements:
- Keep it under 100 words
- Make it WhatsApp-friendly (conversational, no formal language)
- Match the ${tone} tone exactly
- Tailor language for the ${segment} segment
- Include a clear call to action
- Do not use emojis unless the tone is playful

Return only the refined message, no explanation.`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  return block?.type === 'text' ? block.text.trim() : draft;
}
