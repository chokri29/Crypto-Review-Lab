/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CryptoReviewScores {
  utility: number;     // 1-10
  tokenomics: number;  // 1-10
  security: number;    // 1-10
  team: number;        // 1-10
  community: number;   // 1-10
}

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface CryptoReview {
  id: string;
  coingeckoId?: string;
  name: string;
  symbol: string;
  category: string;
  overallScore: number; // 1-100
  grade: string;        // AAA, AA, A, BBB, BB, B, C, D
  verdict: string;      // Summary verdict sentence
  scores: CryptoReviewScores;
  summary: string;      // Markdown review detail
  pros: string[];
  cons: string[];
  riskLevel: RiskLevel;
  createdAt: string;
  author: string;
  logoUrl?: string;
  // CoinGecko Live Market Data fields
  livePrice?: number;
  liveChange24h?: number;
  liveMarketCap?: number;
  liveVolume24h?: number;
  liveRank?: number;
  lastSyncedAt?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}
