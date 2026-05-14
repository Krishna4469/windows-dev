type WaypointRecord = Record<string, unknown>;

export function findShortestPath(
  fromId: string,
  toId: string,
  waypoints: WaypointRecord[],
): string[] {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const graph = new Map<string, string[]>();

  for (const wp of waypoints) {
    const id = wp['id'] as string;
    const raw = wp['connected_to'];
    dist.set(id, Infinity);
    prev.set(id, null);
    graph.set(id, Array.isArray(raw) ? (raw as string[]) : []);
  }

  if (!dist.has(fromId) || !dist.has(toId)) return [];
  dist.set(fromId, 0);

  const pq: Array<{ d: number; id: string }> = [{ d: 0, id: fromId }];
  const visited = new Set<string>();

  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const { d, id: u } = pq.shift()!;

    if (visited.has(u)) continue;
    visited.add(u);
    if (u === toId) break;

    for (const v of graph.get(u) ?? []) {
      if (!dist.has(v)) continue;
      const alt = d + 1;
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
        pq.push({ d: alt, id: v });
      }
    }
  }

  if ((dist.get(toId) ?? Infinity) === Infinity) return [];

  const path: string[] = [];
  let cur: string | null = toId;
  while (cur !== null) {
    path.unshift(cur);
    const p = prev.get(cur);
    cur = p === undefined ? null : p;
  }

  return path[0] === fromId ? path : [];
}

export function generateARDirections(
  path: string[],
  waypoints: WaypointRecord[],
): Array<{ step: number; instruction: string; waypointId: string }> {
  const wpMap = new Map<string, WaypointRecord>();
  for (const wp of waypoints) {
    wpMap.set(wp['id'] as string, wp);
  }

  return path.map((waypointId, i) => {
    const wp = wpMap.get(waypointId);
    if (!wp) return { step: i + 1, instruction: 'Continue', waypointId };

    const label = wp['label'] as string;
    const type = wp['waypoint_type'] as string;

    if (i === 0) return { step: 1, instruction: `Start at ${label}`, waypointId };
    if (i === path.length - 1) return { step: i + 1, instruction: `You have arrived at ${label}`, waypointId };
    if (type === 'elevator') return { step: i + 1, instruction: `Take the ${label}`, waypointId };

    const prevWp = wpMap.get(path[i - 1]!);
    const nextWp = wpMap.get(path[i + 1]!);
    if (!prevWp || !nextWp) return { step: i + 1, instruction: `Continue to ${label}`, waypointId };

    const dx1 = parseFloat(String(wp['x_position'])) - parseFloat(String(prevWp['x_position']));
    const dy1 = parseFloat(String(wp['y_position'])) - parseFloat(String(prevWp['y_position']));
    const dx2 = parseFloat(String(nextWp['x_position'])) - parseFloat(String(wp['x_position']));
    const dy2 = parseFloat(String(nextWp['y_position'])) - parseFloat(String(wp['y_position']));

    // Cross product for turn direction (screen coords: y increases downward)
    const cross = dx1 * dy2 - dy1 * dx2;
    if (cross > 0) return { step: i + 1, instruction: `Turn right at ${label}`, waypointId };
    if (cross < 0) return { step: i + 1, instruction: `Turn left at ${label}`, waypointId };
    return { step: i + 1, instruction: `Go straight to ${label}`, waypointId };
  });
}
