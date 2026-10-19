/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

#!/usr/bin/env node

import { normalizeProtocolCategory } from '../src/services/EvaluationBlueprint';

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    console.error(`ASSERT FAIL: ${message}\n  expected: ${expected}\n  actual:   ${actual}`);
    process.exit(1);
  }
}

try {
  // Required assertions
  assertEqual(
    normalizeProtocolCategory('DePIN / Oracles'),
    'Infrastructure (Oracle / Bridge)',
    'DePIN / Oracles should normalize to Infrastructure (Oracle / Bridge)'
  );

  assertEqual(
    normalizeProtocolCategory('Infrastructure / Oracle'),
    'Infrastructure (Oracle / Bridge)',
    'Infrastructure / Oracle should normalize to Infrastructure (Oracle / Bridge)'
  );

  assertEqual(
    normalizeProtocolCategory('DePIN / Compute'),
    'DePIN (Compute / Storage / Wireless)',
    'DePIN / Compute should normalize to DePIN (Compute / Storage / Wireless)'
  );

  // Optional: phrase match that includes the word 'compute'
  assertEqual(
    normalizeProtocolCategory('Render compute network'),
    'DePIN (Compute / Storage / Wireless)',
    "'Render compute network' should normalize to DePIN (Compute / Storage / Wireless)"
  );

  console.log('All assertions passed.');
  process.exit(0);
} catch (err) {
  console.error('Assertion script failed with error:', err);
  process.exit(1);
}
