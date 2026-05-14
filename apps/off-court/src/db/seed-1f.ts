import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

const VENUE_ID = '00000000-0000-0000-0000-000000000001';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const db = drizzle(pool, { schema });

async function seed(): Promise<void> {
  const [floor] = await db
    .insert(schema.floors)
    .values({ venue_id: VENUE_ID, level_number: 1, name: 'First Floor' })
    .returning();

  if (!floor) throw new Error('Floor insert failed');

  const roomDefs: Array<typeof schema.rooms.$inferInsert> = [
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Yoga Studio A', room_type: 'studio', capacity: 20, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Yoga Studio B', room_type: 'studio', capacity: 20, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Fitness Studio A', room_type: 'studio', capacity: 15, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Fitness Studio B', room_type: 'studio', capacity: 15, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Wellness Treatment Room 1', room_type: 'wellness', capacity: 2, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Wellness Treatment Room 2', room_type: 'wellness', capacity: 2, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Wellness Treatment Room 3', room_type: 'wellness', capacity: 2, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Co-Working Space A', room_type: 'cowork', capacity: 10, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Co-Working Space B', room_type: 'cowork', capacity: 10, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Kids Zone', room_type: 'kids', capacity: 20, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Kids Activity Room', room_type: 'kids', capacity: 15, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Meditation Room A', room_type: 'wellness', capacity: 8, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Meditation Room B', room_type: 'wellness', capacity: 8, status: 'active' },
    { venue_id: VENUE_ID, floor_id: floor.id, name: 'Rooftop Lounge', room_type: 'cafe', capacity: 30, status: 'active' },
  ];

  await db.insert(schema.rooms).values(roomDefs);
  console.log(`Seeded floor "${floor.name}" with ${roomDefs.length} rooms.`);
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
