import { and, eq, gte } from 'drizzle-orm';
import { db } from '../db/client.js';
import { cvAnalytics, cvSessions, healthMetrics } from '../db/schema.js';

export async function computeWellnessScore(memberId: string): Promise<{
  activity: number;
  recovery: number;
  consistency: number;
  overall: number;
  insights: string[];
}> {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [metrics, recentCv] = await Promise.all([
    db.select().from(healthMetrics).where(
      and(eq(healthMetrics.member_id, memberId), gte(healthMetrics.recorded_at, since)),
    ),
    db.select().from(cvAnalytics).where(
      and(eq(cvAnalytics.member_id, memberId), gte(cvAnalytics.created_at, since)),
    ),
  ]);

  const caloriesMetrics = metrics.filter(m => m.metric_type === 'calories-burned');
  const totalCalories = caloriesMetrics.reduce((s, m) => s + parseFloat(m.value), 0);
  const gamesPlayed = recentCv.length;
  const activityScore = Math.min(100, Math.round(gamesPlayed * 10 + totalCalories / 50));

  const sleepMetrics = metrics.filter(m => m.metric_type === 'sleep-hours');
  const restingHrMetrics = metrics.filter(m => m.metric_type === 'resting-hr');
  const avgSleep = sleepMetrics.length > 0
    ? sleepMetrics.reduce((s, m) => s + parseFloat(m.value), 0) / sleepMetrics.length
    : 0;
  const avgRestingHr = restingHrMetrics.length > 0
    ? restingHrMetrics.reduce((s, m) => s + parseFloat(m.value), 0) / restingHrMetrics.length
    : 70;
  const sleepScore = Math.min(50, Math.round((Math.min(avgSleep, 8) / 8) * 50));
  const hrScore = Math.min(50, Math.max(0, Math.round(50 - Math.max(0, avgRestingHr - 60) * 0.5)));
  const recoveryScore = Math.min(100, sleepScore + hrScore);

  const activeDays = new Set([
    ...caloriesMetrics.map(m => m.recorded_at.toISOString().slice(0, 10)),
    ...recentCv.map(c => c.created_at.toISOString().slice(0, 10)),
  ]).size;
  const consistencyScore = Math.min(100, Math.round((activeDays / 12) * 100));

  const overall = Math.round((activityScore + recoveryScore + consistencyScore) / 3);

  const insights: string[] = [];
  if (gamesPlayed >= 8) {
    insights.push(`Excellent — ${gamesPlayed} games played in the last 30 days keeps your activity high.`);
  } else if (gamesPlayed > 0) {
    insights.push(`${gamesPlayed} game${gamesPlayed > 1 ? 's' : ''} this month — aim for 8+ to reach your activity goal.`);
  } else {
    insights.push('No sessions recorded this month. Hit the court to boost your activity score!');
  }

  if (avgSleep >= 7) {
    insights.push(`Averaging ${avgSleep.toFixed(1)}h of sleep — great recovery foundation.`);
  } else if (avgSleep > 0) {
    insights.push(`Sleep average is ${avgSleep.toFixed(1)}h. Target 7-8h nightly for optimal recovery.`);
  } else {
    insights.push('Add sleep data to unlock your personalised recovery score.');
  }

  if (consistencyScore >= 70) {
    insights.push('Outstanding consistency this month — your body is adapting well to training.');
  } else if (consistencyScore >= 40) {
    insights.push('Good momentum — stay active 3+ days per week to push your consistency score higher.');
  } else {
    insights.push('Build a routine with at least 3 active days per week for better consistency.');
  }

  return { activity: activityScore, recovery: recoveryScore, consistency: consistencyScore, overall, insights };
}

export async function deriveMetricsFromCV(sessionId: string, memberId: string): Promise<void> {
  const sessionRows = await db.select().from(cvSessions).where(eq(cvSessions.id, sessionId));
  const session = sessionRows[0];
  if (!session) return;

  const analyticsRows = await db.select().from(cvAnalytics).where(eq(cvAnalytics.session_id, sessionId));
  const analytics = analyticsRows[0];
  if (!analytics) return;

  const durationMinutes = session.ended_at
    ? (session.ended_at.getTime() - session.started_at.getTime()) / 60_000
    : 60;

  const calories = Math.round(analytics.total_rallies * 4 + durationMinutes * 5);

  await db.insert(healthMetrics).values({
    member_id: memberId,
    metric_type: 'calories-burned',
    value: String(calories),
    recorded_at: session.ended_at ?? session.started_at,
    source: 'cv-derived',
  });
}
