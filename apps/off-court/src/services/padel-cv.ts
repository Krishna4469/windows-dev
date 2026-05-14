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

export function detectLineCall(
  ballPosition: { x: number; y: number },
  courtBoundary: number[][],
): boolean {
  const { x, y } = ballPosition;
  let inside = false;
  const n = courtBoundary.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi = 0, yi = 0] = courtBoundary[i] ?? [];
    const [xj = 0, yj = 0] = courtBoundary[j] ?? [];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
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
