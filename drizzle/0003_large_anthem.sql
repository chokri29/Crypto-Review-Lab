ALTER TABLE "market_assets" ADD COLUMN "platforms" jsonb;--> statement-breakpoint
DELETE FROM user_watchlists a USING user_watchlists b WHERE a.id > b.id AND a.user_uid = b.user_uid AND a.symbol = b.symbol;--> statement-breakpoint
ALTER TABLE "user_watchlists" ADD CONSTRAINT "user_watchlists_user_uid_symbol_unique" UNIQUE("user_uid","symbol");