import { eq, and } from 'drizzle-orm';
import { db } from '../db/client.js';
import { displayScreens, displayContent } from '../db/schema.js';

export async function pushContentToScreen(
  screenId: string,
  contentData: Record<string, unknown>,
  contentType: string,
): Promise<void> {
  const screen = await db
    .select({ venue_id: displayScreens.venue_id })
    .from(displayScreens)
    .where(eq(displayScreens.id, screenId))
    .limit(1);

  if (screen.length === 0) throw new Error('Screen not found');

  const [inserted] = await db
    .insert(displayContent)
    .values({
      venue_id: screen[0]!.venue_id,
      content_type: contentType,
      content_data: contentData,
    })
    .returning({ id: displayContent.id });

  await db
    .update(displayScreens)
    .set({ current_content_id: inserted!.id })
    .where(eq(displayScreens.id, screenId));
}

export async function getScreenContent(
  deviceId: string,
): Promise<Record<string, unknown> | null> {
  const rows = await db
    .select({
      content_data: displayContent.content_data,
      content_type: displayContent.content_type,
      expires_at: displayContent.expires_at,
    })
    .from(displayScreens)
    .innerJoin(displayContent, eq(displayScreens.current_content_id, displayContent.id))
    .where(eq(displayScreens.device_id, deviceId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0]!;
  if (row.expires_at && row.expires_at < new Date()) return null;

  return { content_type: row.content_type, content_data: row.content_data };
}

export async function pushScoreUpdate(
  venueId: string,
  roomId: string,
  scoreData: Record<string, unknown>,
): Promise<void> {
  const screens = await db
    .select({ id: displayScreens.id })
    .from(displayScreens)
    .where(
      and(
        eq(displayScreens.venue_id, venueId),
        eq(displayScreens.screen_type, 'court-scoreboard'),
        eq(displayScreens.location_label, roomId),
        eq(displayScreens.status, 'active'),
      ),
    )
    .limit(1);

  if (screens.length === 0) return;

  await pushContentToScreen(screens[0]!.id, scoreData, 'score');
}
