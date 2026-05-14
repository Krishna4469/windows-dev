const SPATIAL_OS_API_URL = process.env['SPATIAL_OS_API_URL'];
const SPATIAL_OS_API_KEY = process.env['SPATIAL_OS_API_KEY'] ?? '';

async function spatialFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${SPATIAL_OS_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${SPATIAL_OS_API_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined ?? {}),
    },
  });
}

export async function getSpatialOSRooms(
  venueId: string,
): Promise<Array<Record<string, unknown>>> {
  if (!SPATIAL_OS_API_URL) return [];
  try {
    const res = await spatialFetch(`/api/rooms?venueId=${encodeURIComponent(venueId)}`);
    if (!res.ok) return [];
    return res.json() as Promise<Array<Record<string, unknown>>>;
  } catch {
    return [];
  }
}

export async function getSpatialOSOverlays(
  venueId: string,
  overlayType: string,
): Promise<Array<Record<string, unknown>>> {
  if (!SPATIAL_OS_API_URL) return [];
  try {
    const res = await spatialFetch(
      `/api/overlays?venueId=${encodeURIComponent(venueId)}&type=${encodeURIComponent(overlayType)}`,
    );
    if (!res.ok) return [];
    return res.json() as Promise<Array<Record<string, unknown>>>;
  } catch {
    return [];
  }
}

export async function pushBookingToSpatialOS(
  venueId: string,
  roomId: string,
  bookingData: Record<string, unknown>,
): Promise<void> {
  if (!SPATIAL_OS_API_URL) return;
  try {
    await spatialFetch('/api/webhooks/booking', {
      method: 'POST',
      body: JSON.stringify({ venueId, roomId, ...bookingData }),
    });
  } catch {
    // best-effort push
  }
}

export function getSpatialOSViewerEmbed(venueId: string): string {
  const base = SPATIAL_OS_API_URL ?? 'https://placeholder.spatial-os.local';
  return `${base}/viewer?venueId=${encodeURIComponent(venueId)}`;
}
