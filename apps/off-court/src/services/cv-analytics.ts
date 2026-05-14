import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cvEvents, cvSessions, cvAnalytics, members } from '../db/schema.js';
import { sendPostGameHighlights } from './whatsapp-templates.js';
import { schedulePostGameDelivery } from './post-game-delivery.js';
import { classifyShot, generateSpiderChart } from './padel-cv.js';
import {
  generateWagonWheel,
  generatePitchMap,
  generateCricketScorecard,
} from './cricket-cv.js';
import { classifySquashShot, generateSquashHeatMap } from './squash-cv.js';
import { classifyBadmintonShot, generateShuttleTrajectory } from './badminton-cv.js';

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

  if (session.sport === 'cricket') {
    const allEvents = events as unknown as Array<Record<string, unknown>>;
    const shotEvents = allEvents.filter((e) => e['event_type'] === 'shot-detected');
    const deliveryEvents = allEvents.filter((e) => e['event_type'] === 'delivery-bowled');

    const wagonWheel = generateWagonWheel(shotEvents);
    const pitchMap = generatePitchMap(deliveryEvents);
    const scorecard = generateCricketScorecard(sessionId, allEvents);

    const [analytics] = await db
      .insert(cvAnalytics)
      .values({
        session_id: sessionId,
        member_id: session.booking_id ?? null,
        sport: session.sport,
        total_points: typeof scorecard['total_runs'] === 'number' ? scorecard['total_runs'] : 0,
        total_rallies: typeof scorecard['balls_faced'] === 'number' ? scorecard['balls_faced'] : 0,
        longest_rally: 0,
        shot_breakdown: scorecard,
        spider_chart: {},
        heat_map: { wagon_wheel: wagonWheel, pitch_map: pitchMap },
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
          totalPoints: typeof scorecard['total_runs'] === 'number' ? scorecard['total_runs'] : 0,
          totalRallies: typeof scorecard['balls_faced'] === 'number' ? scorecard['balls_faced'] : 0,
          highlightsUrl: analytics.highlights_url ?? null,
        });
        schedulePostGameDelivery(sessionId, session.booking_id, member.phone, session.sport).catch(
          (err: unknown) => console.error('schedulePostGameDelivery failed', sessionId, err),
        );
      }
    }

    return;
  }

  if (session.sport === 'squash') {
    const allEvents = events as unknown as Array<Record<string, unknown>>;
    const positionEvents = allEvents.filter((e) => e['event_type'] === 'player-position');

    let totalPoints = 0;
    let totalRallies = 0;
    let longestRally = 0;
    let currentRallyShots = 0;
    const shotBreakdown: Record<string, number> = {};

    for (const event of allEvents) {
      switch (event['event_type']) {
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
          const payload = event['payload'] as Record<string, unknown>;
          const shotType = classifySquashShot(payload);
          shotBreakdown[shotType] = (shotBreakdown[shotType] ?? 0) + 1;
          currentRallyShots++;
          break;
        }
      }
    }

    const heatMap = generateSquashHeatMap(positionEvents);
    const spiderChart = generateSpiderChart({ totalPoints, totalRallies, longestRally, shotBreakdown });

    const [squashAnalytics] = await db
      .insert(cvAnalytics)
      .values({
        session_id: sessionId,
        member_id: session.booking_id ?? null,
        sport: session.sport,
        total_points: totalPoints,
        total_rallies: totalRallies,
        longest_rally: longestRally,
        shot_breakdown: shotBreakdown,
        spider_chart: spiderChart,
        heat_map: { heat_map: heatMap },
      })
      .returning();

    if (!squashAnalytics) return;

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
          highlightsUrl: squashAnalytics.highlights_url ?? null,
        });
        schedulePostGameDelivery(sessionId, session.booking_id, member.phone, session.sport).catch(
          (err: unknown) => console.error('schedulePostGameDelivery failed', sessionId, err),
        );
      }
    }

    return;
  }

  if (session.sport === 'badminton') {
    const allEvents = events as unknown as Array<Record<string, unknown>>;
    const shuttleEvents = allEvents.filter((e) => e['event_type'] === 'shuttle-position');

    let totalPoints = 0;
    let totalRallies = 0;
    let longestRally = 0;
    let currentRallyShots = 0;
    const shotBreakdown: Record<string, number> = {};

    for (const event of allEvents) {
      switch (event['event_type']) {
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
          const payload = event['payload'] as Record<string, unknown>;
          const shotType = classifyBadmintonShot(payload);
          shotBreakdown[shotType] = (shotBreakdown[shotType] ?? 0) + 1;
          currentRallyShots++;
          break;
        }
      }
    }

    const trajectory = generateShuttleTrajectory(shuttleEvents);
    const spiderChart = generateSpiderChart({ totalPoints, totalRallies, longestRally, shotBreakdown });

    const [badmintonAnalytics] = await db
      .insert(cvAnalytics)
      .values({
        session_id: sessionId,
        member_id: session.booking_id ?? null,
        sport: session.sport,
        total_points: totalPoints,
        total_rallies: totalRallies,
        longest_rally: longestRally,
        shot_breakdown: shotBreakdown,
        spider_chart: spiderChart,
        heat_map: { shuttle_trajectory: trajectory },
      })
      .returning();

    if (!badmintonAnalytics) return;

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
          highlightsUrl: badmintonAnalytics.highlights_url ?? null,
        });
        schedulePostGameDelivery(sessionId, session.booking_id, member.phone, session.sport).catch(
          (err: unknown) => console.error('schedulePostGameDelivery failed', sessionId, err),
        );
      }
    }

    return;
  }

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
        const shotType = classifyShot(payload);
        shotBreakdown[shotType] = (shotBreakdown[shotType] ?? 0) + 1;
        currentRallyShots++;
        break;
      }
    }
  }

  const spiderChart = generateSpiderChart({ totalPoints, totalRallies, longestRally, shotBreakdown });

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
      spider_chart: spiderChart,
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
      schedulePostGameDelivery(sessionId, session.booking_id, member.phone, session.sport).catch(
        (err: unknown) => console.error('schedulePostGameDelivery failed', sessionId, err),
      );
    }
  }
}
