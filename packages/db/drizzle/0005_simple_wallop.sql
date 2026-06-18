CREATE TABLE "saved_filter" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" text NOT NULL,
	"entity" text NOT NULL,
	"query" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "watchlist" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "alert" ADD COLUMN "last_triggered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "app_user" ADD COLUMN "password_hash" text NOT NULL;--> statement-breakpoint
ALTER TABLE "saved_filter" ADD CONSTRAINT "saved_filter_user_id_app_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."app_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saved_filter_user_idx" ON "saved_filter" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "alert_unique" ON "alert" USING btree ("user_id","target_type","target_id","trigger");--> statement-breakpoint
CREATE INDEX "alert_user_idx" ON "alert" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_unique" ON "watchlist" USING btree ("user_id","target_type","target_id");--> statement-breakpoint
CREATE INDEX "watchlist_user_idx" ON "watchlist" USING btree ("user_id");