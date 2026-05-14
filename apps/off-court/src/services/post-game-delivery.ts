import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cvAnalytics } from '../db/schema.js';
import { sendTextMessage } from './whatsapp-send.js';
import { scheduleJob } from './job-queue.js';

const SPORT_EMOJI: Record<string, string> = {
  padel: '🎾',
  cricket: '🏏',
  squash: '🎾',
  tennis: '🎾',
  badminton: '🏸',
};

function sportEmoji(sport: string): string {
  return SPORT_EMOJI[sport.toLowerCase()] ?? '🏅';
}

export async function schedulePostGameDelivery(
  sessionId: string,
  memberId: string,
  phone: string,
  sport: string,
): Promise<void> {
  scheduleJob(
    `post-game:${sessionId}`,
    () => deliverPostGameSummary(sessionId, memberId, phone, sport),
    900000,
  );
}

export async function deliverPostGameSummary(
  sessionId: string,
  _memberId: string,
  phone: string,
  sport: string,
): Promise<void> {
  const [analytics] = await db
    .select()
    .from(cvAnalytics)
    .where(eq(cvAnalytics.session_id, sessionId));

  if (!analytics) return;

  const shotBreakdown = analytics.shot_breakdown as Record<string, number>;
  const topShot =
    Object.entries(shotBreakdown).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'N/A';

  const spiderChart = analytics.spider_chart as Record<string, number>;
  const topAxes =
    Object.entries(spiderChart)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([k]) => k)
      .join(', ') || 'N/A';

  const emoji = sportEmoji(sport);
  const summary = [
    `${emoji} Post-game summary — ${sport}`,
    `Score: ${analytics.total_points} pts`,
    `Rallies: ${analytics.total_rallies}  |  Longest: ${analytics.longest_rally}`,
    `Top shot: ${topShot}`,
    `Strengths: ${topAxes}`,
    `View analytics: offcourt://analytics/${sessionId}`,
  ].join('\n');

  await sendTextMessage(phone, summary);

  if (analytics.highlights_url) {
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    await sendTextMessage(phone, `🎬 Watch your highlights: ${analytics.highlights_url}`);
  }
}
