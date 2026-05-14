import { db } from '../db/client.js';
import { staffFaceProfiles, staffClockinEvents, staffMembers } from '../db/schema.js';
import { eq, and, isNull, desc } from 'drizzle-orm';

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export async function enrollFaceProfile(staffId: string, embeddingVector: number[]): Promise<void> {
  await db
    .update(staffFaceProfiles)
    .set({ is_active: false })
    .where(and(eq(staffFaceProfiles.staff_id, staffId), eq(staffFaceProfiles.is_active, true)));

  await db.insert(staffFaceProfiles).values({
    staff_id: staffId,
    embedding_vector: embeddingVector,
  });
}

export async function matchFaceEmbedding(
  incomingEmbedding: number[],
  venueId: string,
): Promise<{ staffId: string; confidence: number } | null> {
  const profiles = await db
    .select({
      staff_id: staffFaceProfiles.staff_id,
      embedding_vector: staffFaceProfiles.embedding_vector,
    })
    .from(staffFaceProfiles)
    .innerJoin(staffMembers, eq(staffFaceProfiles.staff_id, staffMembers.id))
    .where(
      and(
        eq(staffMembers.venue_id, venueId),
        eq(staffFaceProfiles.is_active, true),
      ),
    );

  let bestMatch: { staffId: string; confidence: number } | null = null;

  for (const profile of profiles) {
    const stored = profile.embedding_vector as number[];
    const confidence = cosineSimilarity(incomingEmbedding, stored);
    if (confidence >= 0.85 && (bestMatch === null || confidence > bestMatch.confidence)) {
      bestMatch = { staffId: profile.staff_id, confidence };
    }
  }

  return bestMatch;
}

export async function processFaceClockin(
  venueId: string,
  embedding: number[],
  zone: string,
  deviceId: string,
): Promise<{ staffId: string; staffName: string; clocked_in_at: string } | null> {
  const match = await matchFaceEmbedding(embedding, venueId);
  if (!match) return null;

  const [staff] = await db
    .select({ name: staffMembers.name })
    .from(staffMembers)
    .where(eq(staffMembers.id, match.staffId))
    .limit(1);

  if (!staff) return null;

  const [inserted] = await db
    .insert(staffClockinEvents)
    .values({
      venue_id: venueId,
      staff_id: match.staffId,
      clockin_method: 'face',
      zone,
      confidence: String(match.confidence),
      device_id: deviceId,
    })
    .returning({ clocked_in_at: staffClockinEvents.clocked_in_at });

  if (!inserted) throw new Error('Failed to create clock-in event');

  return {
    staffId: match.staffId,
    staffName: staff.name,
    clocked_in_at: inserted.clocked_in_at.toISOString(),
  };
}

export async function processFaceClockout(staffId: string, venueId: string): Promise<void> {
  const [open] = await db
    .select({ id: staffClockinEvents.id })
    .from(staffClockinEvents)
    .where(
      and(
        eq(staffClockinEvents.staff_id, staffId),
        eq(staffClockinEvents.venue_id, venueId),
        isNull(staffClockinEvents.clocked_out_at),
      ),
    )
    .orderBy(desc(staffClockinEvents.clocked_in_at))
    .limit(1);

  if (!open) throw new Error('No open clock-in found');

  await db
    .update(staffClockinEvents)
    .set({ clocked_out_at: new Date() })
    .where(eq(staffClockinEvents.id, open.id));
}
