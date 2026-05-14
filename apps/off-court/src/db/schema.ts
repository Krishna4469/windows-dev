import { pgTable, uuid, text, varchar, timestamp, unique, integer, numeric, boolean, jsonb, date, time, type AnyPgColumn } from 'drizzle-orm/pg-core';

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

export const proShopItems = pgTable('pro_shop_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  category: varchar('category', { length: 32 }).notNull(),
  brand: text('brand').notNull(),
  price_credits: numeric('price_credits').notNull(),
  price_inr: numeric('price_inr').notNull(),
  stock_quantity: integer('stock_quantity').notNull().default(0),
  image_url: text('image_url'),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const proShopOrders = pgTable('pro_shop_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  member_id: uuid('member_id').notNull(),
  item_id: uuid('item_id').notNull().references(() => proShopItems.id),
  quantity: integer('quantity').notNull().default(1),
  credits_charged: numeric('credits_charged').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const csrContributions = pgTable('csr_contributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  member_id: uuid('member_id').notNull(),
  amount_credits: numeric('amount_credits').notNull(),
  cause: text('cause').notNull(),
  contributed_at: timestamp('contributed_at').defaultNow().notNull(),
});

export const coworkBookings = pgTable('cowork_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  room_id: uuid('room_id').notNull().references(() => rooms.id),
  member_id: uuid('member_id').notNull(),
  date: date('date').notNull(),
  start_time: time('start_time').notNull(),
  end_time: time('end_time').notNull(),
  duration_hours: numeric('duration_hours').notNull(),
  credits_charged: numeric('credits_charged').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('confirmed'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const kidsZoneBookings = pgTable('kids_zone_bookings', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  room_id: uuid('room_id').notNull().references(() => rooms.id),
  member_id: uuid('member_id').notNull(),
  child_name: text('child_name').notNull(),
  child_age: integer('child_age').notNull(),
  activity_type: varchar('activity_type', { length: 32 }).notNull(),
  scheduled_at: timestamp('scheduled_at').notNull(),
  duration_minutes: integer('duration_minutes').notNull().default(60),
  credits_charged: numeric('credits_charged').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('confirmed'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const crmLeads = pgTable('crm_leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 32 }).notNull(),
  email: text('email'),
  source: varchar('source', { length: 32 }).notNull(),
  sport_interest: varchar('sport_interest', { length: 64 }),
  status: varchar('status', { length: 32 }).notNull().default('new'),
  assigned_to: uuid('assigned_to'),
  notes: text('notes'),
  last_contacted_at: timestamp('last_contacted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const crmLifecycleEvents = pgTable('crm_lifecycle_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  lead_id: uuid('lead_id').notNull().references(() => crmLeads.id),
  event_type: varchar('event_type', { length: 32 }).notNull(),
  description: text('description').notNull(),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const corporateAccounts = pgTable('corporate_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  company_name: text('company_name').notNull(),
  contact_name: text('contact_name').notNull(),
  contact_phone: varchar('contact_phone', { length: 32 }).notNull(),
  contact_email: text('contact_email').notNull(),
  employee_count: integer('employee_count').notNull().default(0),
  membership_type: varchar('membership_type', { length: 32 }).notNull().default('bronze'),
  monthly_credits: integer('monthly_credits').notNull().default(0),
  status: varchar('status', { length: 32 }).notNull().default('prospect'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const sponsorAccounts = pgTable('sponsor_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  brand_name: text('brand_name').notNull(),
  contact_name: text('contact_name').notNull(),
  contact_email: text('contact_email').notNull(),
  sponsorship_type: varchar('sponsorship_type', { length: 64 }).notNull(),
  value_inr: numeric('value_inr').notNull(),
  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),
  deliverables: jsonb('deliverables').notNull().default([]),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const sponsorActivations = pgTable('sponsor_activations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sponsor_id: uuid('sponsor_id').notNull().references(() => sponsorAccounts.id),
  activation_type: varchar('activation_type', { length: 64 }).notNull(),
  description: text('description').notNull(),
  scheduled_at: timestamp('scheduled_at').notNull(),
  completed: boolean('completed').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const cvSessions = pgTable('cv_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  room_id: uuid('room_id').notNull(),
  booking_id: uuid('booking_id'),
  sport: varchar('sport', { length: 64 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  started_at: timestamp('started_at').notNull(),
  ended_at: timestamp('ended_at'),
  camera_count: integer('camera_count').notNull().default(1),
  jetson_device_id: text('jetson_device_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const cvEvents = pgTable('cv_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id').notNull().references(() => cvSessions.id),
  event_type: varchar('event_type', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull().default({}),
  confidence: numeric('confidence'),
  timestamp: timestamp('timestamp').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const cvAnalytics = pgTable('cv_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id').notNull().references(() => cvSessions.id),
  member_id: uuid('member_id'),
  sport: varchar('sport', { length: 64 }).notNull(),
  total_points: integer('total_points').notNull().default(0),
  total_rallies: integer('total_rallies').notNull().default(0),
  longest_rally: integer('longest_rally').notNull().default(0),
  win: boolean('win'),
  shot_breakdown: jsonb('shot_breakdown').notNull().default({}),
  spider_chart: jsonb('spider_chart').notNull().default({}),
  heat_map: jsonb('heat_map').notNull().default({}),
  ball_speed_kmh: numeric('ball_speed_kmh'),
  highlights_url: text('highlights_url'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const staffMovementSessions = pgTable('staff_movement_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  staff_id: uuid('staff_id').notNull(),
  zone_id: text('zone_id').notNull(),
  started_at: timestamp('started_at').notNull(),
  ended_at: timestamp('ended_at'),
  device_id: text('device_id').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const staffMovementEvents = pgTable('staff_movement_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id').notNull().references(() => staffMovementSessions.id),
  event_type: varchar('event_type', { length: 32 }).notNull(),
  zone_id: text('zone_id').notNull(),
  payload: jsonb('payload').notNull().default({}),
  timestamp: timestamp('timestamp').notNull(),
});

export const chartOfAccounts = pgTable('chart_of_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  account_code: varchar('account_code', { length: 32 }).notNull().unique(),
  account_name: text('account_name').notNull(),
  account_type: varchar('account_type', { length: 32 }).notNull(),
  parent_account_id: uuid('parent_account_id').references((): AnyPgColumn => chartOfAccounts.id),
  is_system: boolean('is_system').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  entry_date: date('entry_date').notNull(),
  description: text('description').notNull(),
  reference_type: varchar('reference_type', { length: 32 }).notNull(),
  reference_id: uuid('reference_id'),
  created_by: uuid('created_by').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const journalLines = pgTable('journal_lines', {
  id: uuid('id').primaryKey().defaultRandom(),
  journal_id: uuid('journal_id').notNull().references(() => journalEntries.id),
  account_id: uuid('account_id').notNull().references(() => chartOfAccounts.id),
  debit: numeric('debit').notNull().default('0'),
  credit: numeric('credit').notNull().default('0'),
  memo: text('memo'),
});

export const staffAnalytics = pgTable('staff_analytics', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  staff_id: uuid('staff_id').notNull(),
  date: date('date').notNull(),
  zones_covered: integer('zones_covered').notNull().default(0),
  total_distance_m: numeric('total_distance_m').notNull().default('0'),
  idle_time_minutes: integer('idle_time_minutes').notNull().default(0),
  task_completion_rate: numeric('task_completion_rate'),
  peak_activity_hour: integer('peak_activity_hour'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const staffMembers = pgTable('staff_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 32 }).notNull(),
  role: varchar('role', { length: 64 }).notNull(),
  base_salary_inr: numeric('base_salary_inr').notNull(),
  pf_applicable: boolean('pf_applicable').notNull().default(true),
  esic_applicable: boolean('esic_applicable').notNull().default(false),
  bank_account: text('bank_account'),
  ifsc_code: text('ifsc_code'),
  joined_at: date('joined_at').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const attendanceRecords = pgTable('attendance_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  staff_id: uuid('staff_id').notNull().references(() => staffMembers.id),
  date: date('date').notNull(),
  check_in: timestamp('check_in'),
  check_out: timestamp('check_out'),
  hours_worked: numeric('hours_worked').notNull().default('0'),
  status: varchar('status', { length: 32 }).notNull().default('present'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const payrollRuns = pgTable('payroll_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('draft'),
  total_gross_inr: numeric('total_gross_inr').notNull(),
  total_deductions_inr: numeric('total_deductions_inr').notNull(),
  total_net_inr: numeric('total_net_inr').notNull(),
  processed_at: timestamp('processed_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const payrollLineItems = pgTable('payroll_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  payroll_run_id: uuid('payroll_run_id').notNull().references(() => payrollRuns.id),
  staff_id: uuid('staff_id').notNull().references(() => staffMembers.id),
  days_worked: integer('days_worked').notNull(),
  gross_salary: numeric('gross_salary').notNull(),
  pf_deduction: numeric('pf_deduction').notNull(),
  esic_deduction: numeric('esic_deduction').notNull(),
  tds_deduction: numeric('tds_deduction').notNull(),
  net_salary: numeric('net_salary').notNull(),
  bank_account: text('bank_account').notNull(),
  ifsc_code: text('ifsc_code').notNull(),
});

export const complianceChecks = pgTable('compliance_checks', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  check_type: varchar('check_type', { length: 64 }).notNull(),
  check_name: text('check_name').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  issued_date: date('issued_date'),
  expiry_date: date('expiry_date'),
  issuing_authority: text('issuing_authority').notNull(),
  document_url: text('document_url'),
  notes: text('notes').notNull().default(''),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const ppmSchedules = pgTable('ppm_schedules', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  asset_name: text('asset_name').notNull(),
  asset_type: varchar('asset_type', { length: 64 }).notNull(),
  frequency_days: integer('frequency_days').notNull(),
  last_done_at: date('last_done_at'),
  next_due_at: date('next_due_at').notNull(),
  assigned_to: uuid('assigned_to'),
  status: varchar('status', { length: 32 }).notNull().default('scheduled'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const iotSensors = pgTable('iot_sensors', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  room_id: uuid('room_id'),
  sensor_type: varchar('sensor_type', { length: 32 }).notNull(),
  location_label: text('location_label').notNull(),
  device_id: text('device_id').notNull().unique(),
  status: varchar('status', { length: 32 }).notNull().default('active'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const sensorReadings = pgTable('sensor_readings', {
  id: uuid('id').primaryKey().defaultRandom(),
  sensor_id: uuid('sensor_id').notNull().references(() => iotSensors.id),
  value: numeric('value').notNull(),
  unit: varchar('unit', { length: 32 }).notNull(),
  recorded_at: timestamp('recorded_at').notNull(),
  is_alert: boolean('is_alert').notNull().default(false),
});

export const facilityAlerts = pgTable('facility_alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  sensor_id: uuid('sensor_id'),
  alert_type: varchar('alert_type', { length: 64 }).notNull(),
  severity: varchar('severity', { length: 32 }).notNull(),
  message: text('message').notNull(),
  acknowledged: boolean('acknowledged').notNull().default(false),
  acknowledged_by: uuid('acknowledged_by'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const housekeepingTasks = pgTable('housekeeping_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  room_id: uuid('room_id').references(() => rooms.id),
  task_type: varchar('task_type', { length: 32 }).notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  assigned_to: uuid('assigned_to'),
  scheduled_at: timestamp('scheduled_at').notNull(),
  completed_at: timestamp('completed_at'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const valetRequests = pgTable('valet_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  member_id: uuid('member_id').notNull(),
  vehicle_number: text('vehicle_number').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('requested'),
  parking_slot: text('parking_slot'),
  requested_at: timestamp('requested_at').defaultNow().notNull(),
  collected_at: timestamp('collected_at'),
});

export const kitchenOrders = pgTable('kitchen_orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  order_type: varchar('order_type', { length: 32 }).notNull(),
  items: jsonb('items').notNull(),
  status: varchar('status', { length: 32 }).notNull().default('pending'),
  table_number: text('table_number'),
  member_id: uuid('member_id'),
  total_credits: numeric('total_credits').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  ready_at: timestamp('ready_at'),
});

export const environmentMetrics = pgTable('environment_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  metric_type: varchar('metric_type', { length: 32 }).notNull(),
  value: numeric('value').notNull(),
  recorded_date: date('recorded_date').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const sustainabilityTargets = pgTable('sustainability_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  venue_id: uuid('venue_id').notNull(),
  metric_type: varchar('metric_type', { length: 32 }).notNull(),
  target_value: numeric('target_value').notNull(),
  period: varchar('period', { length: 16 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
