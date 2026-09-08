CREATE TYPE "public"."photo_layout_hint" AS ENUM('auto', 'full', 'wide', 'medium', 'left', 'right', 'pair-next');--> statement-breakpoint
CREATE TYPE "public"."photo_orientation" AS ENUM('portrait', 'landscape', 'square');--> statement-breakpoint
CREATE TYPE "public"."shooting_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shooting_id" uuid NOT NULL,
	"url" text NOT NULL,
	"storage_path" text,
	"original_filename" text,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"aspect_ratio" double precision NOT NULL,
	"orientation" "photo_orientation" NOT NULL,
	"alt_en" text,
	"alt_de" text,
	"caption_en" text,
	"caption_de" text,
	"sort_order" integer NOT NULL,
	"archive_visible" boolean DEFAULT true NOT NULL,
	"shooting_visible" boolean DEFAULT true NOT NULL,
	"layout_hint" "photo_layout_hint" DEFAULT 'auto' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "photos_width_check" CHECK ("photos"."width" > 0),
	CONSTRAINT "photos_height_check" CHECK ("photos"."height" > 0),
	CONSTRAINT "photos_aspect_ratio_check" CHECK ("photos"."aspect_ratio" > 0),
	CONSTRAINT "photos_sort_order_check" CHECK ("photos"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shootings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description_en" text,
	"description_de" text,
	"location_en" text,
	"location_de" text,
	"shoot_date" date,
	"year" integer NOT NULL,
	"photographer" text,
	"styling" text,
	"makeup" text,
	"hair" text,
	"client" text,
	"credits" text,
	"cover_photo_id" uuid,
	"featured_on_index" boolean DEFAULT false NOT NULL,
	"index_order" integer,
	"status" "shooting_status" DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "shootings_year_check" CHECK ("shootings"."year" between 1900 and 2100),
	CONSTRAINT "shootings_index_order_check" CHECK ("shootings"."index_order" is null or "shootings"."index_order" >= 0)
);
--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_shooting_id_shootings_id_fk" FOREIGN KEY ("shooting_id") REFERENCES "public"."shootings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shootings" ADD CONSTRAINT "shootings_cover_photo_id_photos_id_fk" FOREIGN KEY ("cover_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "photos_shooting_sort_order_unique" ON "photos" USING btree ("shooting_id","sort_order");--> statement-breakpoint
CREATE INDEX "photos_shooting_idx" ON "photos" USING btree ("shooting_id");--> statement-breakpoint
CREATE INDEX "photos_public_archive_idx" ON "photos" USING btree ("archive_visible","shooting_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "shootings_slug_unique" ON "shootings" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "shootings_public_index_idx" ON "shootings" USING btree ("status","featured_on_index","index_order");--> statement-breakpoint
CREATE INDEX "shootings_public_archive_idx" ON "shootings" USING btree ("status","year");