const BADMINTON_SHOT_CLASSES = ['smash', 'drop', 'clear', 'drive', 'net-shot', 'lift'] as const;

function extractPayload(item: Record<string, unknown>): Record<string, unknown> {
  const sub = item['payload'];
  return sub !== null && typeof sub === 'object' && !Array.isArray(sub)
    ? (sub as Record<string, unknown>)
    : item;
}

export function classifyBadmintonShot(payload: Record<string, unknown>): string {
  const raw = payload['shot_type'];
  if (typeof raw === 'string' && (BADMINTON_SHOT_CLASSES as readonly string[]).includes(raw)) {
    return raw;
  }
  return 'clear';
}

export function generateShuttleTrajectory(
  events: Array<Record<string, unknown>>,
): Array<{ x: number; y: number; height: number }> {
  return events.map((event) => {
    const payload = extractPayload(event);
    const x =
      typeof payload['shuttle_x'] === 'number'
        ? Math.min(1, Math.max(0, payload['shuttle_x']))
        : 0.5;
    const y =
      typeof payload['shuttle_y'] === 'number'
        ? Math.min(1, Math.max(0, payload['shuttle_y']))
        : 0.5;
    const height =
      typeof payload['shuttle_height'] === 'number' ? Math.max(0, payload['shuttle_height']) : 0;
    return { x, y, height };
  });
}
