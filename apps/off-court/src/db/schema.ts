import { pgTable, uuid, text, varchar, timestamp, unique, integer } from 'drizzle-orm/pg-core';

export const crews = pgTable('crews', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  sport: varchar('sport', { length: 64 }).notNull(),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const openGames = pgTable('open_games', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  room_id: uuid('room_id'),
  sport: varchar('sport', { length: 64 }).notNull(),
  game_type: varchar('game_type', { length: 32 }).notNull().default('doubles'),
  scheduled_at: timestamp('scheduled_at').notNull(),
  max_players: integer('max_players').notNull().default(4),
  notes: text('notes'),
  created_by: uuid('created_by').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('open'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const gamePlayers = pgTable(
  'game_players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    game_id: uuid('game_id').notNull().references(() => openGames.id),
    member_id: uuid('member_id').notNull(),
    joined_at: timestamp('joined_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqGamePlayer: unique().on(table.game_id, table.member_id),
  }),
);

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
