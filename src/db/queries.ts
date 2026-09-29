import { db } from './index.ts';
import { cryptoReviews, proOrders, userWatchlists } from './schema.ts';
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
