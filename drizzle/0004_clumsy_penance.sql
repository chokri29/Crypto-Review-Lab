ALTER TABLE "crypto_reviews" ALTER COLUMN "scores" SET DATA TYPE jsonb USING "scores"::jsonb;--> statement-breakpoint
ALTER TABLE "crypto_reviews" ALTER COLUMN "pros" SET DATA TYPE jsonb USING "pros"::jsonb;--> statement-breakpoint
ALTER TABLE "crypto_reviews" ALTER COLUMN "cons" SET DATA TYPE jsonb USING "cons"::jsonb;--> statement-breakpoint
ALTER TABLE "crypto_reviews" ALTER COLUMN "security_scan" SET DATA TYPE jsonb USING "security_scan"::jsonb;--> statement-breakpoint
ALTER TABLE "crypto_reviews" ADD COLUMN "phase_two_re_control" jsonb;--> statement-breakpoint
ALTER TABLE "crypto_reviews" ADD COLUMN "audit_signature" jsonb;--> statement-breakpoint
ALTER TABLE "crypto_reviews" ADD COLUMN "f3_verification" jsonb;--> statement-breakpoint
ALTER TABLE "crypto_reviews" ADD COLUMN "is_signed" boolean DEFAULT false;