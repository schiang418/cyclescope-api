ALTER TABLE "daily_snapshots" ADD COLUMN "delta_v2_asof_date" text;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "delta_v2_schema_version" text;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "delta_v2_created_at" timestamp;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "delta_v2_market_condition" text;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "delta_v2_turning_point" text;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "delta_v2_outlook_1_2_month" text;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "delta_v2_domains" jsonb;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "delta_v2_turning_point_evidence" jsonb;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "delta_v2_outlook_paragraph" text;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "delta_v2_full_analysis" jsonb;--> statement-breakpoint
ALTER TABLE "daily_snapshots" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;