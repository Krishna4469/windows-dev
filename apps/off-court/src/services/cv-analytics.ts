import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cvEvents, cvSessions, cvAnalytics, members } from '../db/schema.js';
import { sendPostGameHighlights } from './whatsapp-templates.js';

export async function generateAnalytics(sessionId: string): Promise<void> {
  const [session] = await db
    .select()
    .from(cvSessions)
    .where(eq(cvSessions.id, sessionId));

  if (!session) return;

  const events = await db
    .select()
    .from(cvEvents)
    .where(eq(cvEvents.session_id, sessionId));

  let totalPoints = 0;
  let totalRallies = 0;
  let longestRally = 0;
  let currentRallyShots = 0;
  const shotBreakdown: Record<string, number> = {};

  for (const event of events) {
    switch (event.event_type) {
      case 'point-scored':
        totalPoints++;
        break;
      case 'rally-start':
        currentRallyShots = 0;
        totalRallies++;
        break;
      case 'rally-end':
        if (currentRallyShots > longestRally) longestRally = currentRallyShots;
        break;
      case 'shot-detected': {
        const payload = event.payload as Record<string, unknown>;
        const shotType = typeof payload['shot_type'] === 'string' ? payload['shot_type'] : 'unknown';
        shotBreakdown[shotType] = (shotBreakdown[shotType] ?? 0) + 1;
        currentRallyShots++;
        break;
      }
    }
  }

  const [analytics] = await db
    .insert(cvAnalytics)
    .values({
      session_id: sessionId,
      member_id: session.booking_id ?? null,
      sport: session.sport,
      total_points: totalPoints,
      total_rallies: totalRallies,
      longest_rally: longestRally,
      shot_breakdown: shotBreakdown,
      heat_map: {},
    })
    .returning();

  if (!analytics) return;

  if (session.booking_id) {
    const [member] = await db
      .select({ phone: members.phone, name: members.name })
      .from(members)
      .where(eq(members.id, session.booking_id));

    if (member) {
      await sendPostGameHighlights(member.phone, {
        sport: session.sport,
        totalPoints,
        totalRallies,
        highlightsUrl: analytics.highlights_url ?? null,
      });
    }
  }
}
