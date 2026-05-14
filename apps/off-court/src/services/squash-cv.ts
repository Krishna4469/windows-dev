const SQUASH_SHOT_CLASSES = ['drop', 'boast', 'drive', 'lob', 'nick', 'volley'] as const;

function extractPayload(item: Record<string, unknown>): Record<string, unknown> {
  const sub = item['payload'];
  return sub !== null && typeof sub === 'object' && !Array.isArray(sub)
    ? (sub as Record<string, unknown>)
    : item;
}

export function classifySquashShot(payload: Record<string, unknown>): string {
  const raw = payload['shot_type'];
  if (typeof raw === 'string' && (SQUASH_SHOT_CLASSES as readonly string[]).includes(raw)) {
    return raw;
  }
  return 'drive';
}

export function generateSquashHeatMap(
  events: Array<Record<string, unknown>>,
): Array<{ x: number; y: number; intensity: number }> {
  return events.map((event) => {
    const payload = extractPayload(event);
    const x =
      typeof payload['court_x'] === 'number' ? Math.min(1, Math.max(0, payload['court_x'])) : 0.5;
    const y =
      typeof payload['court_y'] === 'number' ? Math.min(1, Math.max(0, payload['court_y'])) : 0.5;
    const intensity =
      typeof payload['intensity'] === 'number'
        ? Math.min(1, Math.max(0, payload['intensity']))
        : 0.5;
    return { x, y, intensity };
  });
}
