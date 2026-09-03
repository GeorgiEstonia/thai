import {
  bigserial,
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

const srsColumns = {
  intervalDays: integer('interval_days').notNull().default(0),
  dueAt: timestamp('due_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  reps: integer('reps').notNull().default(0),
  lapses: integer('lapses').notNull().default(0),
}

/**
 * Progress, keyed by item AND direction.
 *
 * Each item is practised in two independent directions — seeing the Thai and
 * recalling the sound, and seeing the IPA and recalling the written form.
 * They are genuinely different skills with different difficulty, so they get
 * separate schedules rather than one shared one.
 *
 * The items themselves (consonants in content/characters.ts, vowels in
 * content/vowels.ts) live in files, not here; only per-user state is stored.
 */
export const itemProgress = pgTable(
  'item_progress',
  {
    itemType: text('item_type', { enum: ['character', 'vowel', 'word'] }).notNull(),
    itemId: text('item_id').notNull(),
    direction: text('direction', { enum: ['recognise', 'produce'] }).notNull(),
    ...srsColumns,
    introducedAt: timestamp('introduced_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.itemType, table.itemId, table.direction] })],
)

/**
 * Vocabulary. Unlike characters and vowels — which are authored content in
 * files — words are yours: typed in, or extracted from a photographed lesson
 * page and approved by you.
 */
export const words = pgTable('words', {
  id: uuid('id').primaryKey().defaultRandom(),
  thai: text('thai').notNull(),
  /** IPA, to match how you work everywhere else in the app. */
  ipa: text('ipa').notNull(),
  english: text('english').notNull(),
  /** A single word, or a whole phrase/sentence kept intact. */
  kind: text('kind', { enum: ['word', 'phrase'] }).notNull().default('word'),
  /** Free-text grouping — a textbook chapter, a lesson, a topic. Null = ungrouped. */
  pack: text('pack'),
  /** Anything else worth keeping — usage, register, who said it. */
  notes: text('notes'),
  source: text('source', { enum: ['manual', 'worksheet'] }).notNull(),
  worksheetId: uuid('worksheet_id'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
})

/**
 * Mnemonics you write yourself, for any kind of item.
 *
 * A mnemonic someone else wrote is a description; one you wrote is a memory
 * hook, and the difference in how well it sticks is the whole point. These sit
 * alongside the authored mnemonics rather than replacing them.
 */
export const itemNotes = pgTable(
  'item_notes',
  {
    itemType: text('item_type', { enum: ['character', 'vowel', 'word'] }).notNull(),
    itemId: text('item_id').notNull(),
    mnemonic: text('mnemonic').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.itemType, table.itemId] })],
)

/**
 * A photographed lesson page and what was pulled out of it.
 *
 * `extracted` holds Claude's proposal as JSON. Nothing reaches `words` until
 * you approve it — OCR of a printed Thai page is good but not perfect, and a
 * wrong card silently rehearsed for weeks is worse than no card.
 */
export const worksheets = pgTable('worksheets', {
  id: uuid('id').primaryKey().defaultRandom(),
  /**
   * How many pages were uploaded. The images themselves live in their own
   * table: keeping them here meant every step re-read the whole batch, so a
   * twenty-page import moved hundreds of megabytes to read twenty pages.
   */
  pageCount: integer('page_count').notNull().default(0),
  /** Pack every approved item from this batch is filed under. */
  pack: text('pack'),
  status: text('status', {
    enum: ['uploading', 'extracting', 'verifying', 'ready', 'failed', 'reviewed'],
  })
    .notNull()
    .default('uploading'),
  /** How many items were verified and filed automatically. */
  autoAdded: integer('auto_added').notNull().default(0),
  /**
   * How many pages have been read so far. Extraction runs one page per
   * request — a whole batch in a single invocation gets killed by the
   * platform's function timeout, leaving the job stuck with no error.
   */
  pagesDone: integer('pages_done').notNull().default(0),
  /** Last time a step made progress, so a stalled job can be spotted. */
  stepAt: timestamp('step_at', { withTimezone: true, mode: 'date' }),
  extracted: jsonb('extracted').$type<ExtractedWord[]>(),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
})

/**
 * One photographed page, stored on its own so a step can load just the page
 * it is about to read.
 */
export const worksheetPages = pgTable(
  'worksheet_pages',
  {
    worksheetId: uuid('worksheet_id')
      .notNull()
      .references(() => worksheets.id, { onDelete: 'cascade' }),
    index: integer('index').notNull(),
    image: text('image').notNull(),
  },
  (table) => [primaryKey({ columns: [table.worksheetId, table.index] })],
)

export interface ExtractedWord {
  thai: string
  ipa: string
  english: string
  /**
   * Sentences are kept whole AND broken into their parts, so a page yields
   * both the phrase you'll want to say and every new word inside it.
   */
  kind: 'word' | 'phrase'
  notes: string | null
  confidence: 'high' | 'medium' | 'low'
  /** Set by the second pass: does this actually look like real Thai? */
  verified?: boolean
  /** Why it was held back, when it was. */
  issue?: string | null
  /** True once it has been filed into the deck. */
  added?: boolean
}

/**
 * Append-only record of every grading, including in-session reinforcement
 * showings (flagged, since those deliberately don't move the schedule).
 *
 * Nothing in the app reads this table. It exists so that months from now the
 * retention data is there to analyse rather than lost — which, given what you
 * do for a living, is probably the most interesting thing this app produces.
 */
export const reviewLog = pgTable('review_log', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  itemType: text('item_type', { enum: ['character', 'vowel', 'word'] }).notNull(),
  itemId: text('item_id').notNull(),
  direction: text('direction', { enum: ['recognise', 'produce'] }).notNull(),
  grade: text('grade', { enum: ['got', 'missed'] }).notNull(),
  reinforcement: boolean('reinforcement').notNull().default(false),
  intervalBefore: integer('interval_before').notNull(),
  intervalAfter: integer('interval_after').notNull(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
})
