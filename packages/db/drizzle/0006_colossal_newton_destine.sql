DROP INDEX "committee_chamber_idx";--> statement-breakpoint
DROP INDEX "legislator_chamber_idx";--> statement-breakpoint
DROP INDEX "calendar_event_external_id_unique";--> statement-breakpoint
DROP INDEX "legislator_natural_key";--> statement-breakpoint
ALTER TABLE "district" ALTER COLUMN "number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "legislator" ALTER COLUMN "district" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "bill" ADD COLUMN "state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD COLUMN "state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "committee" ADD COLUMN "state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "district" ADD COLUMN "state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "district" ADD COLUMN "district_label" text;--> statement-breakpoint
ALTER TABLE "legislator" ADD COLUMN "state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "legislator" ADD COLUMN "district_label" text;--> statement-breakpoint
ALTER TABLE "legislator" ADD COLUMN "source_person_id" text;--> statement-breakpoint
ALTER TABLE "member_position" ADD COLUMN "state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "statement" ADD COLUMN "state" text NOT NULL;--> statement-breakpoint
ALTER TABLE "vote_event" ADD COLUMN "state" text NOT NULL;--> statement-breakpoint
CREATE INDEX "bill_state_session_idx" ON "bill" USING btree ("state","session_year");--> statement-breakpoint
CREATE INDEX "bill_current_location_code_idx" ON "bill" USING btree ("current_location_code");--> statement-breakpoint
CREATE INDEX "committee_state_chamber_idx" ON "committee" USING btree ("state","chamber");--> statement-breakpoint
CREATE UNIQUE INDEX "legislator_source_key" ON "legislator" USING btree ("state","session_year","source_person_id") WHERE source_person_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "legislator_state_chamber_idx" ON "legislator" USING btree ("state","chamber");--> statement-breakpoint
CREATE UNIQUE INDEX "calendar_event_external_id_unique" ON "calendar_event" USING btree ("state","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legislator_natural_key" ON "legislator" USING btree ("state","session_year","chamber","district") WHERE source_person_id IS NULL;