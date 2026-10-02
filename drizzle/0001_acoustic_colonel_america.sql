ALTER TABLE "market_assets" DROP CONSTRAINT IF EXISTS "market_assets_symbol_unique";--> statement-breakpoint
ALTER TABLE "market_assets" ADD COLUMN IF NOT EXISTS "asset_key" text;--> statement-breakpoint
UPDATE "market_assets" SET "asset_key" = CASE 
  WHEN "coingecko_id" IS NOT NULL AND TRIM("coingecko_id") <> '' THEN LOWER(TRIM("coingecko_id"))
  WHEN "network" IS NOT NULL AND "contract_address" IS NOT NULL AND TRIM("contract_address") <> '' THEN LOWER(CONCAT(TRIM("network"), ':', TRIM("contract_address")))
  WHEN "network" IS NOT NULL AND TRIM("network") <> '' THEN LOWER(CONCAT(TRIM("network"), ':', TRIM("symbol")))
  ELSE LOWER(TRIM("symbol"))
END
WHERE "asset_key" IS NULL;--> statement-breakpoint
ALTER TABLE "market_assets" ALTER COLUMN "asset_key" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "market_snapshots" ADD COLUMN IF NOT EXISTS "asset_key" text;--> statement-breakpoint
UPDATE "market_snapshots" ms
SET "asset_key" = ma."asset_key"
FROM "market_assets" ma
WHERE ms."symbol" = ma."symbol" AND ms."network" = ma."network" AND ms."asset_key" IS NULL;--> statement-breakpoint
UPDATE "market_snapshots"
SET "asset_key" = CASE
  WHEN "network" IS NOT NULL AND TRIM("network") <> '' THEN LOWER(CONCAT(TRIM("network"), ':', TRIM("symbol")))
  ELSE LOWER(TRIM("symbol"))
END
WHERE "asset_key" IS NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_assets_symbol_idx" ON "market_assets" USING btree ("symbol");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "market_snapshots_asset_key_synced_at_idx" ON "market_snapshots" USING btree ("asset_key","synced_at");--> statement-breakpoint
ALTER TABLE "market_assets" DROP CONSTRAINT IF EXISTS "market_assets_asset_key_unique";--> statement-breakpoint
ALTER TABLE "market_assets" ADD CONSTRAINT "market_assets_asset_key_unique" UNIQUE("asset_key");
