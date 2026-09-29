import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

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
});

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
