CREATE SCHEMA "raw";
--> statement-breakpoint
CREATE TYPE "public"."chamber" AS ENUM('assembly', 'senate');--> statement-breakpoint
CREATE TYPE "public"."committee_role" AS ENUM('chair', 'vice_chair', 'member');--> statement-breakpoint
CREATE TYPE "public"."sponsor_type" AS ENUM('primary', 'co');--> statement-breakpoint
CREATE TYPE "public"."vote_option" AS ENUM('yea', 'nay', 'abstain', 'absent', 'other');--> statement-breakpoint
CREATE TABLE "alert" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"trigger" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_user" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "bill" (
	"id" text PRIMARY KEY NOT NULL,
	"session_year" text NOT NULL,
	"session" text NOT NULL,
	"measure_type" text NOT NULL,
	"measure_num" integer NOT NULL,
	"identifier" text NOT NULL,
	"chamber_of_origin" "chamber",
	"title" text,
	"summary" text,
	"status" text,
	"status_code" text,
	"current_location" text,
	"current_location_code" text,
	"current_house" text,
	"latest_version_id" text,
	"urgency" boolean,
	"appropriation" boolean,
	"fiscal_committee" boolean,
	"introduced_date" date,
	"last_action_date" timestamp with time zone,
	"last_action_description" text,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "bill_action" (
	"id" text PRIMARY KEY NOT NULL,
	"bill_id" text NOT NULL,
	"action_date" timestamp with time zone,
	"description" text,
	"action_sequence" integer,
	"action_code" text,
	"chamber" "chamber",
	"primary_location" text,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "bill_subject" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" text NOT NULL,
	"subject" text NOT NULL,
	"source" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_event" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"type" text,
	"title" text NOT NULL,
	"committee_id" text,
	"deadline_flag" boolean DEFAULT false NOT NULL,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "committee" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"chamber" "chamber",
	"type" text,
	"location_code" text,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "committee_hearing" (
	"id" text PRIMARY KEY NOT NULL,
	"bill_id" text,
	"committee_id" text,
	"location_code" text,
	"committee_type" text,
	"committee_nr" text,
	"hearing_date" timestamp with time zone,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "committee_membership" (
	"id" serial PRIMARY KEY NOT NULL,
	"committee_id" text NOT NULL,
	"legislator_id" text,
	"role" "committee_role" DEFAULT 'member' NOT NULL,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "district" (
	"id" text PRIMARY KEY NOT NULL,
	"chamber" "chamber" NOT NULL,
	"number" integer NOT NULL,
	"boundary_set" text DEFAULT 'current' NOT NULL,
	"geojson" jsonb,
	"current_legislator_id" text,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "ingest_run" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"stats" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "leadership_role" (
	"id" serial PRIMARY KEY NOT NULL,
	"legislator_id" text,
	"role" text NOT NULL,
	"chamber" "chamber",
	"start_date" date,
	"end_date" date,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "legislator" (
	"id" text PRIMARY KEY NOT NULL,
	"session_year" text NOT NULL,
	"chamber" "chamber" NOT NULL,
	"district" integer NOT NULL,
	"full_name" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"pubinfo_name" text,
	"party" text,
	"photo_url" text,
	"email" text,
	"phone" text,
	"office" text,
	"website" text,
	"seniority" text,
	"term_start" date,
	"term_end" date,
	"active" boolean DEFAULT true NOT NULL,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "raw"."bill_tbl" (
	"bill_id" text,
	"session_year" text,
	"session_num" text,
	"measure_type" text,
	"measure_num" text,
	"measure_state" text,
	"chapter_year" text,
	"chapter_type" text,
	"chapter_session_num" text,
	"chapter_num" text,
	"latest_bill_version_id" text,
	"active_flg" text,
	"trans_uid" text,
	"trans_update" text,
	"current_location" text,
	"current_secondary_loc" text,
	"current_house" text,
	"current_status" text,
	"days_31st_in_print" text
);
--> statement-breakpoint
CREATE TABLE "raw"."bill_detail_vote_tbl" (
	"bill_id" text,
	"location_code" text,
	"legislator_name" text,
	"vote_date_time" text,
	"vote_date_seq" text,
	"vote_code" text,
	"motion_id" text,
	"trans_uid" text,
	"trans_update" text,
	"member_order" text,
	"session_date" text,
	"speaker" text
);
--> statement-breakpoint
CREATE TABLE "raw"."bill_history_tbl" (
	"bill_id" text,
	"bill_history_id" text,
	"action_date" text,
	"action" text,
	"trans_uid" text,
	"trans_update_dt" text,
	"action_sequence" text,
	"action_code" text,
	"action_status" text,
	"primary_location" text,
	"secondary_location" text,
	"ternary_location" text,
	"end_status" text
);
--> statement-breakpoint
CREATE TABLE "raw"."bill_motion_tbl" (
	"motion_id" text,
	"motion_text" text,
	"trans_uid" text,
	"trans_update" text
);
--> statement-breakpoint
CREATE TABLE "raw"."bill_summary_vote_tbl" (
	"bill_id" text,
	"location_code" text,
	"vote_date_time" text,
	"vote_date_seq" text,
	"motion_id" text,
	"ayes" text,
	"noes" text,
	"abstain" text,
	"vote_result" text,
	"trans_uid" text,
	"trans_update" text,
	"file_item_num" text,
	"file_location" text,
	"display_lines" text,
	"session_date" text
);
--> statement-breakpoint
CREATE TABLE "raw"."bill_version_tbl" (
	"bill_version_id" text,
	"bill_id" text,
	"version_num" text,
	"bill_version_action_date" text,
	"bill_version_action" text,
	"request_num" text,
	"subject" text,
	"vote_required" text,
	"appropriation" text,
	"fiscal_committee" text,
	"local_program" text,
	"substantive_changes" text,
	"urgency" text,
	"taxlevy" text,
	"bill_xml_file" text,
	"active_flg" text,
	"trans_uid" text,
	"trans_update" text
);
--> statement-breakpoint
CREATE TABLE "raw"."bill_version_authors_tbl" (
	"bill_version_id" text,
	"type" text,
	"house" text,
	"name" text,
	"contribution" text,
	"committee_members" text,
	"active_flg" text,
	"trans_uid" text,
	"trans_update" text,
	"primary_author_flg" text
);
--> statement-breakpoint
CREATE TABLE "raw"."codes_tbl" (
	"code" text,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "raw"."committee_hearing_tbl" (
	"bill_id" text,
	"committee_type" text,
	"committee_nr" text,
	"hearing_date" text,
	"location_code" text,
	"trans_uid" text,
	"trans_update_date" text
);
--> statement-breakpoint
CREATE TABLE "raw"."legislator_tbl" (
	"district" text,
	"session_year" text,
	"legislator_name" text,
	"house_type" text,
	"author_name" text,
	"first_name" text,
	"last_name" text,
	"middle_initial" text,
	"name_suffix" text,
	"name_title" text,
	"web_name_title" text,
	"party" text,
	"active_flg" text,
	"trans_uid" text,
	"trans_update" text,
	"active_legislator" text
);
--> statement-breakpoint
CREATE TABLE "raw"."location_code_tbl" (
	"session_year" text,
	"location_code" text,
	"location_type" text,
	"consent_calendar_code" text,
	"description" text,
	"long_description" text,
	"active_flg" text,
	"trans_uid" text,
	"trans_update" text,
	"inactive_file_flg" text
);
--> statement-breakpoint
CREATE TABLE "sponsorship" (
	"id" serial PRIMARY KEY NOT NULL,
	"bill_id" text NOT NULL,
	"legislator_id" text,
	"legislator_name" text NOT NULL,
	"type" "sponsor_type" NOT NULL,
	"house" text,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "statement" (
	"id" serial PRIMARY KEY NOT NULL,
	"legislator_id" text,
	"date" timestamp with time zone,
	"type" text,
	"source_url" text,
	"text" text,
	"topics" jsonb,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "vote_event" (
	"id" text PRIMARY KEY NOT NULL,
	"bill_id" text NOT NULL,
	"date" timestamp with time zone,
	"chamber" "chamber",
	"location_code" text,
	"location_name" text,
	"committee_id" text,
	"is_floor" boolean DEFAULT false NOT NULL,
	"motion_id" text,
	"motion" text,
	"result" text,
	"ayes" integer,
	"noes" integer,
	"abstain" integer,
	"source" text NOT NULL,
	"last_verified" timestamp with time zone DEFAULT now() NOT NULL,
	"conflict" boolean DEFAULT false NOT NULL,
	"conflict_details" jsonb
);
--> statement-breakpoint
CREATE TABLE "vote_record" (
	"id" serial PRIMARY KEY NOT NULL,
	"vote_event_id" text NOT NULL,
	"legislator_id" text,
	"legislator_name" text NOT NULL,
	"option" "vote_option" NOT NULL,
	"member_order" integer
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert" ADD CONSTRAINT "alert_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_action" ADD CONSTRAINT "bill_action_bill_id_bill_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bill_subject" ADD CONSTRAINT "bill_subject_bill_id_bill_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_event" ADD CONSTRAINT "calendar_event_committee_id_committee_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committee"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_hearing" ADD CONSTRAINT "committee_hearing_bill_id_bill_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_hearing" ADD CONSTRAINT "committee_hearing_committee_id_committee_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_membership" ADD CONSTRAINT "committee_membership_committee_id_committee_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committee"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "committee_membership" ADD CONSTRAINT "committee_membership_legislator_id_legislator_id_fk" FOREIGN KEY ("legislator_id") REFERENCES "public"."legislator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "district" ADD CONSTRAINT "district_current_legislator_id_legislator_id_fk" FOREIGN KEY ("current_legislator_id") REFERENCES "public"."legislator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leadership_role" ADD CONSTRAINT "leadership_role_legislator_id_legislator_id_fk" FOREIGN KEY ("legislator_id") REFERENCES "public"."legislator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship" ADD CONSTRAINT "sponsorship_bill_id_bill_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sponsorship" ADD CONSTRAINT "sponsorship_legislator_id_legislator_id_fk" FOREIGN KEY ("legislator_id") REFERENCES "public"."legislator"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement" ADD CONSTRAINT "statement_legislator_id_legislator_id_fk" FOREIGN KEY ("legislator_id") REFERENCES "public"."legislator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_event" ADD CONSTRAINT "vote_event_bill_id_bill_id_fk" FOREIGN KEY ("bill_id") REFERENCES "public"."bill"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_event" ADD CONSTRAINT "vote_event_committee_id_committee_id_fk" FOREIGN KEY ("committee_id") REFERENCES "public"."committee"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_record" ADD CONSTRAINT "vote_record_vote_event_id_vote_event_id_fk" FOREIGN KEY ("vote_event_id") REFERENCES "public"."vote_event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vote_record" ADD CONSTRAINT "vote_record_legislator_id_legislator_id_fk" FOREIGN KEY ("legislator_id") REFERENCES "public"."legislator"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bill_measure_type_idx" ON "bill" USING btree ("measure_type");--> statement-breakpoint
CREATE INDEX "bill_status_idx" ON "bill" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bill_origin_idx" ON "bill" USING btree ("chamber_of_origin");--> statement-breakpoint
CREATE INDEX "bill_last_action_idx" ON "bill" USING btree ("last_action_date");--> statement-breakpoint
CREATE INDEX "bill_identifier_idx" ON "bill" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "bill_action_bill_idx" ON "bill_action" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "bill_action_date_idx" ON "bill_action" USING btree ("action_date");--> statement-breakpoint
CREATE INDEX "bill_subject_bill_idx" ON "bill_subject" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "bill_subject_subject_idx" ON "bill_subject" USING btree ("subject");--> statement-breakpoint
CREATE INDEX "committee_location_code_idx" ON "committee" USING btree ("location_code");--> statement-breakpoint
CREATE INDEX "committee_chamber_idx" ON "committee" USING btree ("chamber");--> statement-breakpoint
CREATE INDEX "committee_hearing_date_idx" ON "committee_hearing" USING btree ("hearing_date");--> statement-breakpoint
CREATE INDEX "committee_hearing_bill_idx" ON "committee_hearing" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "committee_hearing_committee_idx" ON "committee_hearing" USING btree ("committee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "committee_membership_unique" ON "committee_membership" USING btree ("committee_id","legislator_id");--> statement-breakpoint
CREATE INDEX "committee_membership_legislator_idx" ON "committee_membership" USING btree ("legislator_id");--> statement-breakpoint
CREATE INDEX "leadership_legislator_idx" ON "leadership_role" USING btree ("legislator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legislator_natural_key" ON "legislator" USING btree ("session_year","chamber","district");--> statement-breakpoint
CREATE INDEX "legislator_chamber_idx" ON "legislator" USING btree ("chamber");--> statement-breakpoint
CREATE INDEX "legislator_last_name_idx" ON "legislator" USING btree ("last_name");--> statement-breakpoint
CREATE INDEX "legislator_pubinfo_name_idx" ON "legislator" USING btree ("pubinfo_name");--> statement-breakpoint
CREATE INDEX "sponsorship_bill_idx" ON "sponsorship" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "sponsorship_legislator_idx" ON "sponsorship" USING btree ("legislator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sponsorship_unique" ON "sponsorship" USING btree ("bill_id","legislator_name","type");--> statement-breakpoint
CREATE INDEX "vote_event_bill_idx" ON "vote_event" USING btree ("bill_id");--> statement-breakpoint
CREATE INDEX "vote_event_date_idx" ON "vote_event" USING btree ("date");--> statement-breakpoint
CREATE INDEX "vote_event_committee_idx" ON "vote_event" USING btree ("committee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vote_record_unique" ON "vote_record" USING btree ("vote_event_id","legislator_name");--> statement-breakpoint
CREATE INDEX "vote_record_event_idx" ON "vote_record" USING btree ("vote_event_id");--> statement-breakpoint
CREATE INDEX "vote_record_legislator_idx" ON "vote_record" USING btree ("legislator_id");