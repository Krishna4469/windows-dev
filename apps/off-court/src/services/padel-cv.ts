const PADEL_SHOT_CLASSES = ['bandeja', 'vibora', 'smash', 'lob', 'volley', 'groundstroke'] as const;

export function classifyShot(eventPayload: Record<string, unknown>): string {
  const raw = eventPayload['shot_type'];
  if (typeof raw === 'string' && (PADEL_SHOT_CLASSES as readonly string[]).includes(raw)) {
    return raw;
  }
  return 'groundstroke';
}

export function calculateHomography(_courtPoints: number[][]): number[][] {
  // Placeholder — real homography computed on Jetson edge device
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
}

function pointToSegmentDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function minDistanceToBoundary(
  point: { x: number; y: number },
  boundary: Array<{ x: number; y: number }>,
): number {
  let min = Infinity;
  const n = boundary.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = boundary[i]!;
    const pj = boundary[j]!;
    const d = pointToSegmentDistance(point.x, point.y, pj.x, pj.y, pi.x, pi.y);
    if (d < min) min = d;
  }
  return min;
}

export function detectLineCall(
  ballPosition: { x: number; y: number },
  courtBoundary: Array<{ x: number; y: number }>,
): boolean {
  const { x, y } = ballPosition;
  let inside = false;
  const n = courtBoundary.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const pi = courtBoundary[i]!;
    const pj = courtBoundary[j]!;
    if ((pi.y > y) !== (pj.y > y) && x < ((pj.x - pi.x) * (y - pi.y)) / (pj.y - pi.y) + pi.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function isNearLine(
  ballPosition: { x: number; y: number },
  courtBoundary: Array<{ x: number; y: number }>,
  thresholdPx: number,
): boolean {
  return minDistanceToBoundary(ballPosition, courtBoundary) <= thresholdPx;
}

const LET_THRESHOLD_PX = 5;

export function generateLineCallResult(
  ballPosition: { x: number; y: number },
  courtBoundary: Array<{ x: number; y: number }>,
): { call: 'in-bound' | 'out' | 'let'; confidence: number; distanceFromLine: number } {
  const inside = detectLineCall(ballPosition, courtBoundary);
  const distanceFromLine = minDistanceToBoundary(ballPosition, courtBoundary);
  const nearLine = isNearLine(ballPosition, courtBoundary, LET_THRESHOLD_PX);

  const call = nearLine ? 'let' : inside ? 'in-bound' : 'out';
  const rawConfidence = nearLine
    ? 0.55 + Math.max(0, (LET_THRESHOLD_PX - distanceFromLine) / (LET_THRESHOLD_PX * 10))
    : Math.min(0.99, 0.75 + distanceFromLine / 200);

  return { call, confidence: Math.round(rawConfidence * 100) / 100, distanceFromLine };
}

interface SpiderAnalytics {
  totalPoints: number;
  totalRallies: number;
  longestRally: number;
  shotBreakdown: Record<string, number>;
}

export function generateSpiderChart(analytics: SpiderAnalytics): Record<string, number> {
  const { totalPoints, totalRallies, longestRally, shotBreakdown } = analytics;
  const totalShots = Object.values(shotBreakdown).reduce((a, b) => a + b, 0);

  const powerShots = (shotBreakdown['smash'] ?? 0) + (shotBreakdown['vibora'] ?? 0);
  const power = totalShots > 0 ? Math.min(100, Math.round((powerShots / totalShots) * 300)) : 0;

  const shotsPerRally = totalRallies > 0 ? totalShots / totalRallies : 0;
  const consistency = Math.min(100, Math.round(shotsPerRally * 5));

  const distinctShots = Object.keys(shotBreakdown).filter((k) => (shotBreakdown[k] ?? 0) > 0).length;
  const variety = Math.min(100, Math.round((distinctShots / 6) * 100));

  const endurance = Math.min(100, Math.round(totalRallies * 1.5 + longestRally * 1.5));

  const placementShots =
    (shotBreakdown['lob'] ?? 0) +
    (shotBreakdown['volley'] ?? 0) +
    (shotBreakdown['bandeja'] ?? 0);
  const placement =
    totalShots > 0 ? Math.min(100, Math.round((placementShots / totalShots) * 300)) : 0;

  const pointsPerRally = totalRallies > 0 ? totalPoints / totalRallies : 0;
  const reaction = Math.min(100, Math.round(pointsPerRally * 50));

  return { power, consistency, variety, endurance, placement, reaction };
}
