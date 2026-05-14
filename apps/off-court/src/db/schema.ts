import { pgTable, uuid, text, varchar, timestamp, unique } from 'drizzle-orm/pg-core';

export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  sport: varchar('sport', { length: 64 }).notNull(),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const crewMembers = pgTable(
  'crew_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    crew_id: uuid('crew_id').notNull().references(() => crews.id),
    member_id: uuid('member_id').notNull(),
    role: varchar('role', { length: 32 }).notNull().default('player'),
    joined_at: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqCrewMember: unique().on(table.crew_id, table.member_id),
  }),
);
