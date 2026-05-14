const STAFF_EVENT_TYPES = ['zone-enter', 'zone-exit', 'idle-detected', 'task-start', 'task-complete'] as const;
type StaffEventType = typeof STAFF_EVENT_TYPES[number];

export function trackZoneTransition(
  staffId: string,
  fromZone: string,
  toZone: string,
  timestamp: Date,
): Record<string, unknown> {
  return {
    staff_id: staffId,
    from_zone: fromZone,
    to_zone: toZone,
    timestamp: timestamp.toISOString(),
    events: [
      { event_type: 'zone-exit', zone_id: fromZone, timestamp: timestamp.toISOString(), payload: {} },
      { event_type: 'zone-enter', zone_id: toZone, timestamp: timestamp.toISOString(), payload: {} },
    ],
  };
}

export function generateStaffAnalytics(
  sessionId: string,
  events: Array<Record<string, unknown>>,
): Record<string, unknown> {
  const zoneIds = new Set<string>();
  let idleSeconds = 0;
  let taskStarts = 0;
  let taskCompletes = 0;
  const hourCounts: Record<number, number> = {};

  for (const event of events) {
    const eventType = event['event_type'] as StaffEventType;
    const zoneId = event['zone_id'] as string | undefined;
    const ts = event['timestamp'];
    const payload = (event['payload'] ?? {}) as Record<string, unknown>;

    if (zoneId) zoneIds.add(zoneId);

    if (ts) {
      const hour = new Date(ts as string).getHours();
      hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    }

    if (eventType === 'idle-detected') {
      const dur = payload['duration_seconds'];
      if (typeof dur === 'number') idleSeconds += dur;
    } else if (eventType === 'task-start') {
      taskStarts++;
    } else if (eventType === 'task-complete') {
      taskCompletes++;
    }
  }

  const peakHour = Object.entries(hourCounts).reduce<number | null>((best, [h, count]) => {
    if (best === null) return Number(h);
    return (hourCounts[best] ?? 0) >= count ? best : Number(h);
  }, null);

  return {
    session_id: sessionId,
    zones_covered: zoneIds.size,
    idle_time_minutes: Math.floor(idleSeconds / 60),
    task_completion_rate: taskStarts > 0 ? taskCompletes / taskStarts : null,
    peak_activity_hour: peakHour,
  };
}

export function detectIdleStaff(
  events: Array<Record<string, unknown>>,
  thresholdMinutes: number,
): boolean {
  const thresholdSeconds = thresholdMinutes * 60;
  return events.some((event) => {
    if (event['event_type'] !== 'idle-detected') return false;
    const payload = (event['payload'] ?? {}) as Record<string, unknown>;
    const dur = payload['duration_seconds'];
    return typeof dur === 'number' && dur > thresholdSeconds;
  });
}
