import { pgTable, uuid, text, varchar, timestamp, unique, integer, numeric, boolean, jsonb } from 'drizzle-orm/pg-core';

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  phone: varchar('phone', { length: 32 }).notNull().unique(),
  name: text('name').notNull(),
  email: text('email'),
  credit_balance: numeric('credit_balance').notNull().default('0'),
  tier: varchar('tier', { length: 32 }).notNull().default('Explorer'),
  segment: varchar('segment', { length: 32 }).notNull().default('active'),
  days_since_last_visit: integer('days_since_last_visit').notNull().default(0),
  referral_code: text('referral_code').unique(),
  referred_by_id: uuid('referred_by_id'),
  whatsapp_opt_in: jsonb('whatsapp_opt_in').notNull().default({ booking: true, analytics: true, events: true, promotions: false }),
  preferences: jsonb('preferences').notNull().default({}),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

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

export const leaderboardEntries = pgTable(
  'leaderboard_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venue_id: uuid('venue_id').notNull(),
    member_id: uuid('member_id').notNull(),
    member_name: text('member_name').notNull(),
    sport: varchar('sport', { length: 64 }).notNull(),
    total_games: integer('total_games').notNull().default(0),
    total_wins: integer('total_wins').notNull().default(0),
    win_rate: numeric('win_rate'),
    last_played: timestamp('last_played'),
    opt_in: boolean('opt_in').notNull().default(false),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqVenueMemberSport: unique().on(table.venue_id, table.member_id, table.sport),
  }),
);
