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
    revision: integer('revision').notNull().default(0),
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
    contentType: text('content_type'),
    fileSize: integer('file_size'),
    blobEtag: text('blob_etag'),
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
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('photos_shooting_sort_order_unique').on(
      table.shootingId,
      table.sortOrder,
    ),
    index('photos_shooting_idx').on(table.shootingId),
    uniqueIndex('photos_storage_path_unique').on(table.storagePath),
    index('photos_public_archive_idx').on(
      table.archiveVisible,
      table.shootingId,
      table.sortOrder,
    ),
    check('photos_width_check', sql`${table.width} > 0`),
    check('photos_height_check', sql`${table.height} > 0`),
    check('photos_aspect_ratio_check', sql`${table.aspectRatio} > 0`),
    check(
      'photos_file_size_check',
      sql`${table.fileSize} is null or ${table.fileSize} > 0`,
    ),
    check('photos_sort_order_check', sql`${table.sortOrder} >= 0`),
  ],
);

export const siteSettings = pgTable(
  'site_settings',
  {
    id: text('id').primaryKey(),
    modelName: text('model_name').notNull(),
    baseEn: text('base_en'),
    baseDe: text('base_de'),
    bioEn: text('bio_en'),
    bioDe: text('bio_de'),
    height: text('height'),
    bust: text('bust'),
    waist: text('waist'),
    hips: text('hips'),
    shoeSize: text('shoe_size'),
    hairEn: text('hair_en'),
    hairDe: text('hair_de'),
    eyesEn: text('eyes_en'),
    eyesDe: text('eyes_de'),
    additionalDetailEn: text('additional_detail_en'),
    additionalDetailDe: text('additional_detail_de'),
    agencyName: text('agency_name'),
    agencyLocationEn: text('agency_location_en'),
    agencyLocationDe: text('agency_location_de'),
    agencyUrl: text('agency_url'),
    agencyBookingEmail: text('agency_booking_email'),
    emphasizeAgency: boolean('emphasize_agency').notNull().default(false),
    publicEmail: text('public_email'),
    contactLabelEn: text('contact_label_en'),
    contactLabelDe: text('contact_label_de'),
    additionalContactLabelEn: text('additional_contact_label_en'),
    additionalContactLabelDe: text('additional_contact_label_de'),
    additionalContactValue: text('additional_contact_value'),
    additionalContactUrl: text('additional_contact_url'),
    emailClickable: boolean('email_clickable').notNull().default(false),
    instagramHandle: text('instagram_handle'),
    instagramUrl: text('instagram_url'),
    instagramInFooter: boolean('instagram_in_footer').notNull().default(true),
    languagesEn: text('languages_en'),
    languagesDe: text('languages_de'),
    baseCitiesEn: text('base_cities_en'),
    baseCitiesDe: text('base_cities_de'),
    selectedClientsEn: text('selected_clients_en'),
    selectedClientsDe: text('selected_clients_de'),
    portraitUrl: text('portrait_url').notNull(),
    portraitStoragePath: text('portrait_storage_path'),
    portraitOriginalFilename: text('portrait_original_filename'),
    portraitContentType: text('portrait_content_type'),
    portraitFileSize: integer('portrait_file_size'),
    portraitBlobEtag: text('portrait_blob_etag'),
    portraitWidth: integer('portrait_width').notNull(),
    portraitHeight: integer('portrait_height').notNull(),
    portraitAltEn: text('portrait_alt_en').notNull(),
    portraitAltDe: text('portrait_alt_de'),
    portraitPhotographer: text('portrait_photographer'),
    portraitCredit: text('portrait_credit'),
    compCardEnabled: boolean('comp_card_enabled').notNull().default(false),
    compCardUrl: text('comp_card_url'),
    compCardStoragePath: text('comp_card_storage_path'),
    compCardOriginalFilename: text('comp_card_original_filename'),
    compCardContentType: text('comp_card_content_type'),
    compCardFileSize: integer('comp_card_file_size'),
    compCardBlobEtag: text('comp_card_blob_etag'),
    yearStatementEn: text('year_statement_en'),
    yearStatementDe: text('year_statement_de'),
    revision: integer('revision').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('site_settings_primary_check', sql`${table.id} = 'primary'`),
    check(
      'site_settings_model_name_check',
      sql`length(trim(${table.modelName})) > 0`,
    ),
    check(
      'site_settings_portrait_width_check',
      sql`${table.portraitWidth} > 0`,
    ),
    check(
      'site_settings_portrait_height_check',
      sql`${table.portraitHeight} > 0`,
    ),
    check(
      'site_settings_portrait_alt_en_check',
      sql`length(trim(${table.portraitAltEn})) > 0`,
    ),
    check(
      'site_settings_portrait_file_size_check',
      sql`${table.portraitFileSize} is null or ${table.portraitFileSize} > 0`,
    ),
    check(
      'site_settings_comp_card_file_size_check',
      sql`${table.compCardFileSize} is null or ${table.compCardFileSize} > 0`,
    ),
    check('site_settings_revision_check', sql`${table.revision} >= 0`),
  ],
);

export type ShootingRow = typeof shootings.$inferSelect;
export type NewShootingRow = typeof shootings.$inferInsert;
export type PhotoRow = typeof photos.$inferSelect;
export type NewPhotoRow = typeof photos.$inferInsert;
export type SiteSettingsRow = typeof siteSettings.$inferSelect;
export type NewSiteSettingsRow = typeof siteSettings.$inferInsert;
