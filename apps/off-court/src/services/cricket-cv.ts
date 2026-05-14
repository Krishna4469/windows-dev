const CRICKET_SHOT_CLASSES = [
  'cover-drive', 'pull', 'sweep', 'cut', 'straight-drive', 'flick', 'hook', 'defensive',
] as const;

const DELIVERY_TYPES = new Set(['good-length', 'short', 'full', 'yorker']);

const ZONE_NAMES = [
  'fine-leg', 'square-leg', 'mid-wicket', 'long-on',
  'long-off', 'cover', 'point', 'third-man',
] as const;

function extractPayload(item: Record<string, unknown>): Record<string, unknown> {
  const sub = item['payload'];
  return sub !== null && typeof sub === 'object' && !Array.isArray(sub)
    ? (sub as Record<string, unknown>)
    : item;
}

export function classifyCricketShot(payload: Record<string, unknown>): string {
  const raw = payload['shot_type'];
  if (typeof raw === 'string' && (CRICKET_SHOT_CLASSES as readonly string[]).includes(raw)) {
    return raw;
  }
  return 'defensive';
}

export function generateWagonWheel(
  shotEvents: Array<Record<string, unknown>>,
): Array<{ angle: number; distance: number; runs: number }> {
  return shotEvents.map((event) => {
    const payload = extractPayload(event);
    const angle = typeof payload['direction_angle'] === 'number' ? payload['direction_angle'] : 0;
    const runs = typeof payload['runs'] === 'number' ? payload['runs'] : 0;
    const distance = Math.min(1, Math.max(0.2, 0.2 + runs * 0.13));
    return { angle, distance, runs };
  });
}

export function generatePitchMap(
  deliveryEvents: Array<Record<string, unknown>>,
): Array<{ x: number; y: number; type: string }> {
  return deliveryEvents.map((event) => {
    const payload = extractPayload(event);
    const x = typeof payload['pitch_x'] === 'number' ? Math.min(1, Math.max(0, payload['pitch_x'])) : 0.5;
    const y = typeof payload['pitch_y'] === 'number' ? Math.min(1, Math.max(0, payload['pitch_y'])) : 0.5;
    const rawType = typeof payload['delivery_type'] === 'string' ? payload['delivery_type'] : '';
    const type = DELIVERY_TYPES.has(rawType) ? rawType : 'good-length';
    return { x, y, type };
  });
}

export function calculateVirtualFieldScore(
  shotEvents: Array<Record<string, unknown>>,
): Record<string, number> {
  const zones: Record<string, number> = Object.fromEntries(ZONE_NAMES.map((z) => [z, 0]));

  for (const event of shotEvents) {
    const payload = extractPayload(event);
    const angle = typeof payload['direction_angle'] === 'number' ? payload['direction_angle'] : 0;
    const runs = typeof payload['runs'] === 'number' ? payload['runs'] : 0;
    const zoneIndex = Math.floor(((angle % 360) + 360) % 360 / 45) % 8;
    const zoneName = ZONE_NAMES[zoneIndex] ?? 'fine-leg';
    zones[zoneName] = (zones[zoneName] ?? 0) + runs;
  }

  return zones;
}

export function generateCricketScorecard(
  sessionId: string,
  events: Array<Record<string, unknown>>,
): Record<string, unknown> {
  let totalRuns = 0;
  let ballsFaced = 0;
  let fours = 0;
  let sixes = 0;
  let wickets = 0;

  for (const event of events) {
    const eventType = event['event_type'];
    const payload = extractPayload(event);

    switch (eventType) {
      case 'shot-detected': {
        ballsFaced++;
        const runs = typeof payload['runs'] === 'number' ? payload['runs'] : 0;
        totalRuns += runs;
        if (runs === 4) fours++;
        if (runs === 6) sixes++;
        break;
      }
      case 'wicket':
        wickets++;
        break;
      case 'boundary': {
        const runs = typeof payload['runs'] === 'number' ? payload['runs'] : 0;
        if (runs === 4) fours++;
        if (runs === 6) sixes++;
        break;
      }
    }
  }

  const strikeRate = ballsFaced > 0 ? Math.round((totalRuns / ballsFaced) * 100) : 0;
  const overs = `${Math.floor(ballsFaced / 6)}.${ballsFaced % 6}`;

  return {
    session_id: sessionId,
    total_runs: totalRuns,
    balls_faced: ballsFaced,
    strike_rate: strikeRate,
    fours,
    sixes,
    wickets,
    overs,
  };
}
