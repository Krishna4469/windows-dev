import Anthropic from '@anthropic-ai/sdk';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cvAnalytics, cvSessions, members } from '../db/schema.js';
import { scheduleJob } from './job-queue.js';

const anthropic = new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });

export interface RailCameraContent {
  caption: string;
  hashtags: string[];
  instagramCTA: string;
}

export async function generateRailCameraContent(sessionId: string): Promise<RailCameraContent> {
  const [[analytics], [session]] = await Promise.all([
    db.select().from(cvAnalytics).where(eq(cvAnalytics.session_id, sessionId)),
    db.select().from(cvSessions).where(eq(cvSessions.id, sessionId)),
  ]);

  let firstName = 'Champ';
  if (analytics?.member_id) {
    const [member] = await db
      .select({ name: members.name })
      .from(members)
      .where(eq(members.id, analytics.member_id));
    if (member) {
      firstName = member.name.split(' ')[0] ?? 'Champ';
    }
  }

  const sport = session?.sport ?? analytics?.sport ?? 'sport';
  const totalPoints = analytics?.total_points ?? 0;
  const totalRallies = analytics?.total_rallies ?? 0;
  const ballSpeed = analytics?.ball_speed_kmh ?? null;
  const win = analytics?.win ?? null;

  const prompt = `You are a social media content creator for a premium sports venue. Generate Instagram content for a rail camera session highlight.

Player: ${firstName} (first name only — never include a last name)
Sport: ${sport}
Points: ${totalPoints}
Rallies: ${totalRallies}${ballSpeed ? `\nBall Speed: ${ballSpeed} km/h` : ''}${win !== null ? `\nResult: ${win ? 'Win' : 'Loss'}` : ''}

Generate:
1. A celebratory Instagram caption — 2-3 sentences, sport-specific energy, mention ${firstName} by first name only
2. Exactly 8 relevant hashtags (without the # symbol)
3. A short Instagram CTA under 15 words

Respond with JSON only, no markdown fences:
{"caption":"...","hashtags":["..."],"instagramCTA":"..."}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const block = response.content[0];
  const raw = block?.type === 'text' ? block.text.trim() : '{}';

  const parsed = JSON.parse(raw) as {
    caption?: string;
    hashtags?: string[];
    instagramCTA?: string;
  };

  return {
    caption: parsed.caption ?? '',
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : [],
    instagramCTA: parsed.instagramCTA ?? '',
  };
}

export function scheduleContentPost(
  sessionId: string,
  memberId: string,
  delayMinutes: number,
): void {
  scheduleJob(
    `rail-camera:${sessionId}:${memberId}`,
    async () => {
      const content = await generateRailCameraContent(sessionId);
      console.log('[rail-camera] content ready', sessionId, content.caption.slice(0, 60));
    },
    delayMinutes * 60 * 1000,
  );
}
