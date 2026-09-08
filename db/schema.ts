import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

export const shootingStatus = pgEnum('shooting_status', [
  'draft',
  'published',
  'archived',
]);

export const photoOrientation = pgEnum('photo_orientation', [
  'portrait',
  'landscape',
  'square',
]);

export const photoLayoutHint = pgEnum('photo_layout_hint', [
  'auto',
  'full',
  'wide',
  'medium',
  'left',
  'right',
  'pair-next',
]);

export const shootings = pgTable(
  'shootings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    descriptionEn: text('description_en'),
    descriptionDe: text('description_de'),
    locationEn: text('location_en'),
    locationDe: text('location_de'),
    shootDate: date('shoot_date', { mode: 'date' }),
    year: integer('year').notNull(),
    photographer: text('photographer'),
    styling: text('styling'),
    makeup: text('makeup'),
    hair: text('hair'),
    client: text('client'),
    credits: text('credits'),
    coverPhotoId: uuid('cover_photo_id').references(
      (): AnyPgColumn => photos.id,
      { onDelete: 'set null' },
    ),
    featuredOnIndex: boolean('featured_on_index').notNull().default(false),
    indexOrder: integer('index_order'),
    status: shootingStatus('status').notNull().default('draft'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('shootings_slug_unique').on(table.slug),
    index('shootings_public_index_idx').on(
      table.status,
      table.featuredOnIndex,
      table.indexOrder,
    ),
    index('shootings_public_archive_idx').on(table.status, table.year),
    check('shootings_year_check', sql`${table.year} between 1900 and 2100`),
    check(
      'shootings_index_order_check',
      sql`${table.indexOrder} is null or ${table.indexOrder} >= 0`,
    ),
  ],
);

export const photos = pgTable(
  'photos',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    shootingId: uuid('shooting_id')
      .notNull()
      .references(() => shootings.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    storagePath: text('storage_path'),
    originalFilename: text('original_filename'),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    aspectRatio: doublePrecision('aspect_ratio').notNull(),
    orientation: photoOrientation('orientation').notNull(),
    altEn: text('alt_en'),
    altDe: text('alt_de'),
    captionEn: text('caption_en'),
    captionDe: text('caption_de'),
    sortOrder: integer('sort_order').notNull(),
    archiveVisible: boolean('archive_visible').notNull().default(true),
    shootingVisible: boolean('shooting_visible').notNull().default(true),
    layoutHint: photoLayoutHint('layout_hint').notNull().default('auto'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('photos_shooting_sort_order_unique').on(
      table.shootingId,
      table.sortOrder,
    ),
    index('photos_shooting_idx').on(table.shootingId),
    index('photos_public_archive_idx').on(
      table.archiveVisible,
      table.shootingId,
      table.sortOrder,
    ),
    check('photos_width_check', sql`${table.width} > 0`),
    check('photos_height_check', sql`${table.height} > 0`),
    check('photos_aspect_ratio_check', sql`${table.aspectRatio} > 0`),
    check('photos_sort_order_check', sql`${table.sortOrder} >= 0`),
  ],
);

export type ShootingRow = typeof shootings.$inferSelect;
export type NewShootingRow = typeof shootings.$inferInsert;
export type PhotoRow = typeof photos.$inferSelect;
export type NewPhotoRow = typeof photos.$inferInsert;
