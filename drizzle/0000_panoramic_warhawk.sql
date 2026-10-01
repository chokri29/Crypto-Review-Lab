CREATE TABLE "crypto_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"review_id" text NOT NULL,
	"user_uid" text,
	"name" text NOT NULL,
	"symbol" text NOT NULL,
	"category" text,
	"network" text,
	"overall_score" integer,
	"risk_level" text,
	"verdict" text,
	"scores" text,
	"summary" text,
	"pros" text,
	"cons" text,
	"contract_address" text,
	"security_scan" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "crypto_reviews_review_id_unique" UNIQUE("review_id")
);
--> statement-breakpoint
CREATE TABLE "market_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"coingecko_id" text,
	"category" text,
	"network" text NOT NULL,
	"contract_address" text,
	"decimals" integer,
	"logo_url" text,
	"is_verified" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "market_assets_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "market_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" text NOT NULL,
	"network" text NOT NULL,
	"price_usd" text,
	"change_24h" text,
	"market_cap_usd" text,
	"volume_24h_usd" text,
	"circulating_supply" text,
	"total_supply" text,
	"max_supply" text,
	"all_time_high_usd" text,
	"all_time_low_usd" text,
	"price_divergence_pct" text,
	"supply_divergence_pct" text,
	"confidence_score" integer,
	"confidence_level" text,
	"source_consensus" text,
	"raw_payload" text,
	"synced_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "network_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"network" text NOT NULL,
	"chain_id" text,
	"gas_token" text,
	"native_token" text,
	"explorer_url" text,
	"active_assets_count" integer DEFAULT 0,
	"total_tvl_usd" text,
	"status" text DEFAULT 'active',
	"last_synced_at" timestamp DEFAULT now(),
	CONSTRAINT "network_metrics_network_unique" UNIQUE("network")
);
--> statement-breakpoint
CREATE TABLE "pro_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"client_email" text NOT NULL,
	"project_name" text NOT NULL,
	"project_symbol" text NOT NULL,
	"contract_address" text,
	"chain_id" text,
	"status" text DEFAULT 'intake_received' NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_reference" text,
	"focus_area" text,
	"verification_depth" text,
	"stress_simulation" text,
	"report_data" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "pro_orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "telemetry_sync_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_name" text NOT NULL,
	"status" text NOT NULL,
	"items_synced" integer DEFAULT 0,
	"latency_ms" integer,
	"details" text,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_watchlists" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_uid" text NOT NULL,
	"symbol" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"network" text,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"photo_url" text,
	"role" text DEFAULT 'user',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE INDEX "crypto_reviews_user_uid_idx" ON "crypto_reviews" USING btree ("user_uid");--> statement-breakpoint
CREATE INDEX "market_assets_network_idx" ON "market_assets" USING btree ("network");--> statement-breakpoint
CREATE INDEX "market_snapshots_symbol_synced_at_idx" ON "market_snapshots" USING btree ("symbol","synced_at");--> statement-breakpoint
CREATE INDEX "user_watchlists_user_uid_idx" ON "user_watchlists" USING btree ("user_uid");