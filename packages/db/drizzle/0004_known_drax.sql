ALTER TABLE "calendar_event" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "detail" text;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "source_url" text;--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_event_external_id_unique" ON "calendar_event" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "calendar_event_date_idx" ON "calendar_event" USING btree ("date");--> statement-breakpoint
CREATE INDEX "calendar_event_type_idx" ON "calendar_event" USING btree ("type");