CREATE TYPE "public"."stance" AS ENUM('support', 'oppose', 'mixed', 'neutral', 'unknown');--> statement-breakpoint
CREATE TABLE "member_position" (
	"id" serial PRIMARY KEY NOT NULL,
	"legislator_id" text,
	"topic" text NOT NULL,
	"stance" "stance" DEFAULT 'unknown' NOT NULL,
	"note" text,
	"bill_id" text,
	"source_url" text,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
ALTER TABLE "legislator" ADD COLUMN "next_election_year" integer;--> statement-breakpoint
CREATE INDEX "member_position_legislator_idx" ON "member_position" USING btree ("legislator_id");--> statement-breakpoint
CREATE INDEX "member_position_topic_idx" ON "member_position" USING btree ("topic");--> statement-breakpoint
CREATE UNIQUE INDEX "member_position_unique" ON "member_position" USING btree ("legislator_id","topic");