/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * One-time seed script to import crypto_reviews.json into the primary PostgreSQL database (crypto_reviews).
 * Run manually via: bun run scripts/seedReviewsFromJson.ts (Do not run automatically).
 */

import fs from 'fs';
import path from 'path';
import { upsertDbReview } from '../src/db/queries.ts';

async function seed() {
  const filePath = path.join(process.cwd(), 'crypto_reviews.json');
  if (!fs.existsSync(filePath)) {
    console.log('crypto_reviews.json not found.');
    process.exit(0);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const reviews = JSON.parse(raw);
  if (!Array.isArray(reviews) || !reviews.length) {
    console.log('No reviews found in crypto_reviews.json.');
    process.exit(0);
  }

  console.log(`Found ${reviews.length} reviews in crypto_reviews.json. Seeding into PostgreSQL...`);

  for (const r of reviews) {
    try {
      await upsertDbReview({
        reviewId: r.reviewId || r.id || `${r.symbol}-review`,
        userUid: r.userUid || r.user_uid || undefined,
        name: r.name,
        symbol: r.symbol,
        category: r.category || 'DeFi / Web3',
        network: r.network || r.chain || 'Ethereum',
        overallScore: typeof r.overallScore === 'number' ? r.overallScore : undefined,
        riskLevel: r.riskLevel || r.risk_level || 'Medium',
        verdict: r.verdict || '',
        scores: r.scores || {},
        summary: r.summary || '',
        pros: Array.isArray(r.pros) ? r.pros : [],
        cons: Array.isArray(r.cons) ? r.cons : [],
        contractAddress: r.contractAddress || r.contract_address || undefined,
        securityScan: r.securityScan || r.security_scan || undefined,
        phaseTwoReControl: r.phaseTwoReControl || r.phase_two_re_control || undefined,
        auditSignature: r.auditSignature || r.audit_signature || undefined,
        f3Verification: r.f3Verification || r.f3_verification || undefined,
        isSigned: typeof r.isSigned === 'boolean' ? r.isSigned : (typeof r.is_signed === 'boolean' ? r.is_signed : false)
      });
      console.log(`Successfully seeded review: ${r.symbol} (${r.reviewId || r.id})`);
    } catch (err) {
      console.error(`Failed to seed review ${r.symbol}:`, err);
    }
  }

  console.log('Seeding completed successfully.');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed script failed:', err);
  process.exit(1);
});
