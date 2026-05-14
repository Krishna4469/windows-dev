import { eq, count, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { ifcUploads, ifcElements, rooms } from '../db/schema.js';

const IFC_ELEMENT_TYPES = [
  'IfcSpace',
  'IfcWall',
  'IfcDoor',
  'IfcWindow',
  'IfcSlab',
  'IfcColumn',
  'IfcBeam',
  'IfcStair',
  'IfcRoof',
  'IfcFurnishingElement',
] as const;

function generateGlobalId(): string {
  return Math.random().toString(36).substring(2, 12).toUpperCase() +
    Math.random().toString(36).substring(2, 12).toUpperCase();
}

export async function processIFCUpload(uploadId: string, _venueId: string): Promise<void> {
  await db
    .update(ifcUploads)
    .set({ upload_status: 'processing' })
    .where(eq(ifcUploads.id, uploadId));

  const elements = IFC_ELEMENT_TYPES.map((type, i) => ({
    upload_id: uploadId,
    global_id: generateGlobalId(),
    element_type: type,
    name: `${type.replace('Ifc', '')} ${String(i + 1).padStart(3, '0')}`,
    properties: {
      level: `Level ${Math.floor(i / 4) + 1}`,
      material: i % 2 === 0 ? 'Concrete' : 'Steel',
      area_m2: Number((Math.random() * 50 + 5).toFixed(2)),
    },
  }));

  await db.insert(ifcElements).values(elements);

  const countRows = await db
    .select({ total: count() })
    .from(ifcElements)
    .where(eq(ifcElements.upload_id, uploadId));
  const elementCount = Number(countRows[0]?.total ?? 0);

  await db
    .update(ifcUploads)
    .set({
      upload_status: 'completed',
      element_count: elementCount,
      floor_count: 3,
      room_count: elements.filter((e) => e.element_type === 'IfcSpace').length,
    })
    .where(eq(ifcUploads.id, uploadId));
}

export async function getUploadStatus(uploadId: string): Promise<Record<string, unknown>> {
  const [upload] = await db
    .select()
    .from(ifcUploads)
    .where(eq(ifcUploads.id, uploadId))
    .limit(1);

  if (!upload) {
    throw new Error('Upload not found');
  }

  const countRows2 = await db
    .select({ total: count() })
    .from(ifcElements)
    .where(eq(ifcElements.upload_id, uploadId));
  const elementCount2 = Number(countRows2[0]?.total ?? 0);

  return { ...upload, element_count: elementCount2 };
}

export async function linkElementsToRooms(uploadId: string, venueId: string): Promise<void> {
  const elements = await db
    .select({ id: ifcElements.id, name: ifcElements.name })
    .from(ifcElements)
    .where(eq(ifcElements.upload_id, uploadId));

  const venueRooms = await db
    .select({ id: rooms.id, name: rooms.name })
    .from(rooms)
    .where(eq(rooms.venue_id, venueId));

  const roomMap = new Map(venueRooms.map((r) => [r.name.toLowerCase(), r.id]));

  for (const el of elements) {
    const roomId = roomMap.get(el.name.toLowerCase());
    if (roomId) {
      await db
        .update(ifcElements)
        .set({ room_id: roomId })
        .where(eq(ifcElements.id, el.id));
    }
  }

  const linkedRows = await db
    .select({ linked: count() })
    .from(ifcElements)
    .where(
      sql`${ifcElements.upload_id} = ${uploadId} AND ${ifcElements.room_id} IS NOT NULL`,
    );
  const linkedCount = Number(linkedRows[0]?.linked ?? 0);

  await db
    .update(ifcUploads)
    .set({ room_count: linkedCount })
    .where(eq(ifcUploads.id, uploadId));
}
