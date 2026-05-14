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

export const events = pgTable('events', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  room_id: uuid('room_id'),
  title: text('title').notNull(),
  description: text('description'),
  event_type: varchar('event_type', { length: 32 }).notNull(),
  sport: varchar('sport', { length: 64 }).notNull(),
  scheduled_at: timestamp('scheduled_at').notNull(),
  duration_minutes: integer('duration_minutes').notNull().default(60),
  max_capacity: integer('max_capacity').notNull(),
  current_rsvp: integer('current_rsvp').notNull().default(0),
  status: varchar('status', { length: 32 }).notNull().default('upcoming'),
  organiser_id: uuid('organiser_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const eventRsvps = pgTable(
  'event_rsvps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    event_id: uuid('event_id').notNull().references(() => events.id),
    member_id: uuid('member_id').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('confirmed'),
    waitlist_position: integer('waitlist_position'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqEventMember: unique().on(table.event_id, table.member_id),
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

export const tournaments = pgTable('tournaments', {
  id: uuid('id').primaryKey().defaultRandom(),
  event_id: uuid('event_id').notNull().references(() => events.id),
  format: varchar('format', { length: 32 }).notNull().default('elimination'),
  sport: varchar('sport', { length: 64 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('registration'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const tournamentMatches = pgTable('tournament_matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  tournament_id: uuid('tournament_id').notNull().references(() => tournaments.id),
  round: integer('round').notNull(),
  match_number: integer('match_number').notNull(),
  player1_id: uuid('player1_id'),
  player2_id: uuid('player2_id'),
  player1_score: integer('player1_score'),
  player2_score: integer('player2_score'),
  winner_id: uuid('winner_id'),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  scheduled_at: timestamp('scheduled_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const floors = pgTable('floors', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  level_number: integer('level_number').notNull(),
  name: text('name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  floor_id: uuid('floor_id').notNull().references(() => floors.id),
  name: text('name').notNull(),
  room_type: varchar('room_type', { length: 32 }).notNull(),
  sport: varchar('sport', { length: 64 }),
  capacity: integer('capacity').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const classes = pgTable('classes', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  room_id: uuid('room_id').references(() => rooms.id),
  instructor_id: uuid('instructor_id'),
  title: text('title').notNull(),
  description: text('description'),
  class_type: varchar('class_type', { length: 32 }).notNull(),
  duration_minutes: integer('duration_minutes').notNull().default(60),
  max_capacity: integer('max_capacity').notNull().default(15),
  current_bookings: integer('current_bookings').notNull().default(0),
  scheduled_at: timestamp('scheduled_at').notNull(),
  recurring: boolean('recurring').notNull().default(false),
  recurrence_rule: text('recurrence_rule'),
  credits_cost: numeric('credits_cost').notNull().default('10'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const classBookings = pgTable(
  'class_bookings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    class_id: uuid('class_id').notNull().references(() => classes.id),
    member_id: uuid('member_id').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('confirmed'),
    booked_at: timestamp('booked_at').defaultNow().notNull(),
  },
  (table) => ({
    uniqClassMember: unique().on(table.class_id, table.member_id),
  }),
);

export const wellnessTreatments = pgTable('wellness_treatments', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  room_id: uuid('room_id').references(() => rooms.id),
  name: text('name').notNull(),
  description: text('description'),
  treatment_type: varchar('treatment_type', { length: 32 }).notNull(),
  duration_minutes: integer('duration_minutes').notNull(),
  credits_cost: numeric('credits_cost').notNull(),
  therapist_name: text('therapist_name'),
  max_daily_slots: integer('max_daily_slots').notNull().default(8),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const wellnessBookings = pgTable('wellness_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  treatment_id: uuid('treatment_id').notNull().references(() => wellnessTreatments.id),
  member_id: uuid('member_id').notNull(),
  scheduled_at: timestamp('scheduled_at').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('confirmed'),
  credits_charged: numeric('credits_charged').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const wellnessCombos = pgTable('wellness_combos', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  treatment_ids: jsonb('treatment_ids').notNull(),
  total_credits: numeric('total_credits').notNull(),
  discount_percent: numeric('discount_percent').notNull().default('0'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
