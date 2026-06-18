ALTER TABLE "bill" ADD COLUMN "digest" text;--> statement-breakpoint
ALTER TABLE "bill" ADD COLUMN "full_text" text;--> statement-breakpoint
ALTER TABLE "bill" ADD COLUMN "search_tsv" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce("identifier", '') || ' ' || coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("digest", '')), 'B') ||
  setweight(to_tsvector('english', coalesce("full_text", '')), 'C')
) STORED;--> statement-breakpoint
CREATE INDEX "bill_search_idx" ON "bill" USING gin ("search_tsv");