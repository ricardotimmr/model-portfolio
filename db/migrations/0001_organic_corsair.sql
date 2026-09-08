ALTER TABLE "photos" ADD COLUMN "content_type" text;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "file_size" integer;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "blob_etag" text;--> statement-breakpoint
ALTER TABLE "photos" ADD COLUMN "uploaded_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "photos_storage_path_unique" ON "photos" USING btree ("storage_path");--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_file_size_check" CHECK ("photos"."file_size" is null or "photos"."file_size" > 0);