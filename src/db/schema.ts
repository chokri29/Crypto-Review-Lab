import { relations } from 'drizzle-orm';
import { index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Users Table (keyed to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Crypto Reviews Table
export const cryptoReviews = pgTable('crypto_reviews', {
  id: serial('id').primaryKey(),
  reviewId: text('review_id').notNull().unique(),
  userUid: text('user_uid'),
  name: text('name').notNull(),
  symbol: text('symbol').notNull(),
  category: text('category'),
  network: text('network'),
  overallScore: integer('overall_score'),
  riskLevel: text('risk_level'),
  verdict: text('verdict'),
  scores: text('scores'), // JSON serialized scores object
  summary: text('summary'),
  pros: text('pros'), // JSON serialized string array
  cons: text('cons'), // JSON serialized string array
  contractAddress: text('contract_address'),
  securityScan: text('security_scan'), // JSON serialized security scan
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('crypto_reviews_user_uid_idx').on(table.userUid),
]);

// 3. Pro Orders Table
export const proOrders = pgTable('pro_orders', {
  id: serial('id').primaryKey(),
  orderId: text('order_id').notNull().unique(),
  clientEmail: text('client_email').notNull(),
  projectName: text('project_name').notNull(),
  projectSymbol: text('project_symbol').notNull(),
  contractAddress: text('contract_address'),
  chainId: text('chain_id'),
  status: text('status').notNull().default('intake_received'),
  paymentStatus: text('payment_status').notNull().default('pending'),
  paymentReference: text('payment_reference'),
  focusArea: text('focus_area'),
  verificationDepth: text('verification_depth'),
  stressSimulation: text('stress_simulation'),
  reportData: text('report_data'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 4. User Watchlists Table
export const userWatchlists = pgTable('user_watchlists', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  symbol: text('symbol').notNull(),
  name: text('name').notNull(),
  category: text('category'),
  network: text('network'),
  addedAt: timestamp('added_at').defaultNow(),
}, (table) => [
  index('user_watchlists_user_uid_idx').on(table.userUid),
]);

// 5. Market Assets Registry Table (canonical registry of tracked market assets)
export const marketAssets = pgTable('market_assets', {
  id: serial('id').primaryKey(),
  assetKey: text('asset_key').notNull().unique(),
  symbol: text('symbol').notNull(),
  name: text('name').notNull(),
  coingeckoId: text('coingecko_id'),
  category: text('category'),
  network: text('network').notNull(), // 'Robinhood Chain', 'Ethereum', 'Arbitrum', 'Solana', 'Sui', 'Kaspa'
  contractAddress: text('contract_address'),
  decimals: integer('decimals'),
  logoUrl: text('logo_url'),
  isVerified: integer('is_verified').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('market_assets_network_idx').on(table.network),
  index('market_assets_symbol_idx').on(table.symbol),
]);

// 6. Market Snapshots Table (proactive multi-source consensus records)
export const marketSnapshots = pgTable('market_snapshots', {
  id: serial('id').primaryKey(),
  assetKey: text('asset_key').notNull(),
  symbol: text('symbol').notNull(),
  network: text('network').notNull(),
  priceUsd: text('price_usd'),
  change24h: text('change_24h'),
  marketCapUsd: text('market_cap_usd'),
  volume24hUsd: text('volume_24h_usd'),
  circulatingSupply: text('circulating_supply'),
  totalSupply: text('total_supply'),
  maxSupply: text('max_supply'),
  allTimeHighUsd: text('all_time_high_usd'),
  allTimeLowUsd: text('all_time_low_usd'),
  priceDivergencePct: text('price_divergence_pct'),
  supplyDivergencePct: text('supply_divergence_pct'),
  confidenceScore: integer('confidence_score'),
  confidenceLevel: text('confidence_level'),
  sourceConsensus: text('source_consensus'),
  rawPayload: text('raw_payload'),
  syncedAt: timestamp('synced_at').defaultNow(),
}, (table) => [
  index('market_snapshots_symbol_synced_at_idx').on(table.symbol, table.syncedAt),
  index('market_snapshots_asset_key_synced_at_idx').on(table.assetKey, table.syncedAt),
]);

// 7. Network Metrics Table (dynamic classification & infrastructure health)
export const networkMetrics = pgTable('network_metrics', {
  id: serial('id').primaryKey(),
  network: text('network').notNull().unique(),
  chainId: text('chain_id'),
  gasToken: text('gas_token'),
  nativeToken: text('native_token'),
  explorerUrl: text('explorer_url'),
  activeAssetsCount: integer('active_assets_count').default(0),
  totalTvlUsd: text('total_tvl_usd'),
  status: text('status').default('active'),
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),
});

// 8. Telemetry Sync Logs Table (audit trail for background ingestion engine)
export const telemetrySyncLogs = pgTable('telemetry_sync_logs', {
  id: serial('id').primaryKey(),
  jobName: text('job_name').notNull(),
  status: text('status').notNull(),
  itemsSynced: integer('items_synced').default(0),
  latencyMs: integer('latency_ms'),
  details: text('details'),
  executedAt: timestamp('executed_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  reviews: many(cryptoReviews),
  watchlists: many(userWatchlists),
}));

export const cryptoReviewsRelations = relations(cryptoReviews, ({ one }) => ({
  user: one(users, {
    fields: [cryptoReviews.userUid],
    references: [users.uid],
  }),
}));

export const userWatchlistsRelations = relations(userWatchlists, ({ one }) => ({
  user: one(users, {
    fields: [userWatchlists.userUid],
    references: [users.uid],
  }),
}));
