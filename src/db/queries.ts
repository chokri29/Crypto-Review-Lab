import { db } from './index.ts';
import { cryptoReviews, proOrders, userWatchlists, marketAssets, marketSnapshots, networkMetrics, telemetrySyncLogs } from './schema.ts';
import { eq, desc, and } from 'drizzle-orm';

// Reviews Queries
export async function getDbReviews() {
  try {
    return await db.select().from(cryptoReviews).orderBy(desc(cryptoReviews.createdAt));
  } catch (error) {
    console.error("Database getDbReviews failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function upsertDbReview(review: {
  reviewId: string;
  userUid?: string;
  name: string;
  symbol: string;
  category?: string;
  network?: string;
  overallScore?: number;
  riskLevel?: string;
  verdict?: string;
  scores?: any;
  summary?: string;
  pros?: string[];
  cons?: string[];
  contractAddress?: string;
  securityScan?: any;
}) {
  try {
    const scoresStr = review.scores ? JSON.stringify(review.scores) : null;
    const prosStr = review.pros ? JSON.stringify(review.pros) : null;
    const consStr = review.cons ? JSON.stringify(review.cons) : null;
    const securityScanStr = review.securityScan ? JSON.stringify(review.securityScan) : null;

    const result = await db.insert(cryptoReviews)
      .values({
        reviewId: review.reviewId,
        userUid: review.userUid || null,
        name: review.name,
        symbol: review.symbol,
        category: review.category || null,
        network: review.network || null,
        overallScore: review.overallScore ?? null,
        riskLevel: review.riskLevel || null,
        verdict: review.verdict || null,
        scores: scoresStr,
        summary: review.summary || null,
        pros: prosStr,
        cons: consStr,
        contractAddress: review.contractAddress || null,
        securityScan: securityScanStr,
      })
      .onConflictDoUpdate({
        target: cryptoReviews.reviewId,
        set: {
          name: review.name,
          symbol: review.symbol,
          category: review.category || null,
          network: review.network || null,
          overallScore: review.overallScore ?? null,
          riskLevel: review.riskLevel || null,
          verdict: review.verdict || null,
          scores: scoresStr,
          summary: review.summary || null,
          pros: prosStr,
          cons: consStr,
          contractAddress: review.contractAddress || null,
          securityScan: securityScanStr,
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database upsertDbReview failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

// Pro Orders Queries
export async function getDbOrders() {
  try {
    return await db.select().from(proOrders).orderBy(desc(proOrders.createdAt));
  } catch (error) {
    console.error("Database getDbOrders failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function upsertDbOrder(order: {
  orderId: string;
  clientEmail: string;
  projectName: string;
  projectSymbol: string;
  contractAddress?: string;
  chainId?: string;
  status: string;
  paymentStatus: string;
  paymentReference?: string;
  focusArea?: string;
  verificationDepth?: string;
  stressSimulation?: string;
  reportData?: any;
}) {
  try {
    const reportDataStr = order.reportData ? JSON.stringify(order.reportData) : null;
    const result = await db.insert(proOrders)
      .values({
        orderId: order.orderId,
        clientEmail: order.clientEmail,
        projectName: order.projectName,
        projectSymbol: order.projectSymbol,
        contractAddress: order.contractAddress || null,
        chainId: order.chainId || null,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentReference: order.paymentReference || null,
        focusArea: order.focusArea || null,
        verificationDepth: order.verificationDepth || null,
        stressSimulation: order.stressSimulation || null,
        reportData: reportDataStr,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: proOrders.orderId,
        set: {
          status: order.status,
          paymentStatus: order.paymentStatus,
          paymentReference: order.paymentReference || null,
          reportData: reportDataStr,
          updatedAt: new Date(),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error("Database upsertDbOrder failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

// User Watchlists Queries
export async function getUserWatchlist(userUid: string) {
  try {
    return await db.select().from(userWatchlists).where(eq(userWatchlists.userUid, userUid));
  } catch (error) {
    console.error("Database getUserWatchlist failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function addToWatchlist(item: {
  userUid: string;
  symbol: string;
  name: string;
  category?: string;
  network?: string;
}) {
  try {
    const result = await db.insert(userWatchlists)
      .values({
        userUid: item.userUid,
        symbol: item.symbol,
        name: item.name,
        category: item.category || null,
        network: item.network || null,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database addToWatchlist failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function removeFromWatchlist(userUid: string, symbol: string) {
  try {
    return await db.delete(userWatchlists)
      .where(and(eq(userWatchlists.userUid, userUid), eq(userWatchlists.symbol, symbol)));
  } catch (error) {
    console.error("Database removeFromWatchlist failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

// Market Assets Queries
export async function getMarketAssets() {
  try {
    return await db.select().from(marketAssets);
  } catch (error) {
    console.error("Database getMarketAssets failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function upsertMarketAsset(asset: {
  symbol: string;
  name: string;
  coingeckoId?: string;
  category?: string;
  network: string;
  contractAddress?: string;
  decimals?: number;
  logoUrl?: string;
  isVerified?: number;
}) {
  try {
    const result = await db.insert(marketAssets)
      .values({
        symbol: asset.symbol,
        name: asset.name,
        coingeckoId: asset.coingeckoId || null,
        category: asset.category || null,
        network: asset.network,
        contractAddress: asset.contractAddress || null,
        decimals: asset.decimals ?? null,
        logoUrl: asset.logoUrl || null,
        isVerified: asset.isVerified ?? 1,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: marketAssets.symbol,
        set: {
          name: asset.name,
          coingeckoId: asset.coingeckoId || null,
          category: asset.category || null,
          network: asset.network,
          contractAddress: asset.contractAddress || null,
          decimals: asset.decimals ?? null,
          logoUrl: asset.logoUrl || null,
          isVerified: asset.isVerified ?? 1,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database upsertMarketAsset failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

// Market Snapshots Queries
export async function getLatestMarketSnapshots() {
  try {
    return await db.select().from(marketSnapshots).orderBy(desc(marketSnapshots.syncedAt));
  } catch (error) {
    console.error("Database getLatestMarketSnapshots failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function upsertMarketSnapshot(snapshot: {
  symbol: string;
  network: string;
  priceUsd?: string;
  change24h?: string;
  marketCapUsd?: string;
  volume24hUsd?: string;
  circulatingSupply?: string;
  totalSupply?: string;
  maxSupply?: string;
  allTimeHighUsd?: string;
  allTimeLowUsd?: string;
  priceDivergencePct?: string;
  supplyDivergencePct?: string;
  confidenceScore?: number;
  confidenceLevel?: string;
  sourceConsensus?: string;
  rawPayload?: any;
}) {
  try {
    const rawPayloadStr = snapshot.rawPayload ? JSON.stringify(snapshot.rawPayload) : null;
    const result = await db.insert(marketSnapshots)
      .values({
        symbol: snapshot.symbol,
        network: snapshot.network,
        priceUsd: snapshot.priceUsd || null,
        change24h: snapshot.change24h || null,
        marketCapUsd: snapshot.marketCapUsd || null,
        volume24hUsd: snapshot.volume24hUsd || null,
        circulatingSupply: snapshot.circulatingSupply || null,
        totalSupply: snapshot.totalSupply || null,
        maxSupply: snapshot.maxSupply || null,
        allTimeHighUsd: snapshot.allTimeHighUsd || null,
        allTimeLowUsd: snapshot.allTimeLowUsd || null,
        priceDivergencePct: snapshot.priceDivergencePct || null,
        supplyDivergencePct: snapshot.supplyDivergencePct || null,
        confidenceScore: snapshot.confidenceScore ?? null,
        confidenceLevel: snapshot.confidenceLevel || null,
        sourceConsensus: snapshot.sourceConsensus || null,
        rawPayload: rawPayloadStr,
        syncedAt: new Date(),
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database upsertMarketSnapshot failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

// Network Metrics Queries
export async function getNetworkMetrics() {
  try {
    return await db.select().from(networkMetrics);
  } catch (error) {
    console.error("Database getNetworkMetrics failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function upsertNetworkMetric(metric: {
  network: string;
  chainId?: string;
  gasToken?: string;
  nativeToken?: string;
  explorerUrl?: string;
  activeAssetsCount?: number;
  totalTvlUsd?: string;
  status?: string;
}) {
  try {
    const updateSet: Record<string, any> = {
      lastSyncedAt: new Date(),
    };
    if (metric.chainId !== undefined) updateSet.chainId = metric.chainId || null;
    if (metric.gasToken !== undefined) updateSet.gasToken = metric.gasToken || null;
    if (metric.nativeToken !== undefined) updateSet.nativeToken = metric.nativeToken || null;
    if (metric.explorerUrl !== undefined) updateSet.explorerUrl = metric.explorerUrl || null;
    if (metric.activeAssetsCount !== undefined) updateSet.activeAssetsCount = metric.activeAssetsCount;
    if (metric.totalTvlUsd !== undefined) updateSet.totalTvlUsd = metric.totalTvlUsd || null;
    if (metric.status !== undefined) updateSet.status = metric.status;

    const result = await db.insert(networkMetrics)
      .values({
        network: metric.network,
        chainId: metric.chainId || null,
        gasToken: metric.gasToken || null,
        nativeToken: metric.nativeToken || null,
        explorerUrl: metric.explorerUrl || null,
        activeAssetsCount: metric.activeAssetsCount ?? 0,
        totalTvlUsd: metric.totalTvlUsd || null,
        status: metric.status || 'active',
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: networkMetrics.network,
        set: updateSet,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database upsertNetworkMetric failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

// Telemetry Sync Logs
export async function recordTelemetrySyncLog(log: {
  jobName: string;
  status: string;
  itemsSynced?: number;
  latencyMs?: number;
  details?: string;
}) {
  try {
    const result = await db.insert(telemetrySyncLogs)
      .values({
        jobName: log.jobName,
        status: log.status,
        itemsSynced: log.itemsSynced ?? 0,
        latencyMs: log.latencyMs ?? 0,
        details: log.details || null,
        executedAt: new Date(),
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Database recordTelemetrySyncLog failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getTelemetrySyncLogs(limit: number = 20) {
  try {
    return await db.select().from(telemetrySyncLogs).orderBy(desc(telemetrySyncLogs.executedAt)).limit(limit);
  } catch (error) {
    console.error("Database getTelemetrySyncLogs failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getMarketSnapshotBySymbol(symbol: string) {
  try {
    const snapshots = await db.select().from(marketSnapshots)
      .where(eq(marketSnapshots.symbol, symbol.toUpperCase()))
      .orderBy(desc(marketSnapshots.syncedAt))
      .limit(1);
    return snapshots[0] || null;
  } catch (error) {
    console.error(`Database getMarketSnapshotBySymbol failed for ${symbol}:`, error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getHistoricalSnapshots(symbol?: string, limit: number = 30) {
  try {
    if (symbol) {
      return await db.select().from(marketSnapshots)
        .where(eq(marketSnapshots.symbol, symbol.toUpperCase()))
        .orderBy(desc(marketSnapshots.syncedAt))
        .limit(limit);
    }
    return await db.select().from(marketSnapshots)
      .orderBy(desc(marketSnapshots.syncedAt))
      .limit(limit);
  } catch (error) {
    console.error("Database getHistoricalSnapshots failed:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
