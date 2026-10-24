import fs from 'fs';
import os from 'os';
import path from 'path';

// Point proOrderService to a temporary test file, not the repo fixture
const tempOrdersPath = path.join(os.tmpdir(), `pro_orders_test_${Date.now()}_${Math.random().toString(36).slice(2)}.json`);
process.env.CRL_ORDERS_FILE_PATH = tempOrdersPath;
fs.writeFileSync(tempOrdersPath, '[]', 'utf-8');

import { createProOrder, processNowPaymentsIpn, getOrderByIdAsync, clearAllOrders } from '../services/proOrderService.js';
import assert from 'assert';

async function runMoneyPathTest() {
  try {
    console.log('--- Running Money Path Smoke Test ---');
    await clearAllOrders();

    const draft = {
      id: 'test-draft',
      name: 'Test Token',
      symbol: 'TEST',
      category: 'Smart Contract / Web3',
      scores: { utility: 8, tokenomics: 8, security: 8, team: 8, community: 8 },
      summary: 'Test summary',
      verdict: 'Test verdict',
      pros: [],
      cons: [],
      riskLevel: 'Low' as const,
      createdAt: new Date().toISOString(),
      author: 'Test'
    };

    // 1. POST create pro-order
    const order = await createProOrder({
      clientEmail: 'test-buyer@example.com',
      projectName: 'Test Token',
      projectSymbol: 'TEST',
      contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
      systemDraft: draft,
      paymentReference: 'test_ref_999'
    });

    // 2. Assert paymentStatus PENDING and status AWAITING_PAYMENT (Fail if create starts PAID)
    assert.strictEqual(order.paymentStatus, 'PENDING', 'FAIL: Pro order must start with paymentStatus PENDING');
    assert.strictEqual(order.status, 'AWAITING_PAYMENT', 'FAIL: Pro order must start with status AWAITING_PAYMENT');
    console.log('✓ Pro order created with PENDING payment and AWAITING_PAYMENT status');

    // 3. Fail if unlock works via voucher / payment reference without IPN
    assert.notStrictEqual(order.status, 'DELIVERED', 'FAIL: Order must not be delivered without IPN');
    assert.notStrictEqual(order.paymentStatus, 'PAID', 'FAIL: Order must not be PAID without IPN');
    console.log('✓ Confirmed order is locked prior to IPN verification');

    // 4. Simulate verified NOWPayments IPN
    const ipnResult = await processNowPaymentsIpn({
      order_id: order.orderId,
      payment_status: 'finished',
      payment_id: 'now_pay_777888',
      pay_amount: 149,
      pay_currency: 'USDT'
    });

    // 5. Assert PAID and unlock only after IPN
    assert.strictEqual(ipnResult.success, true, 'FAIL: NOWPayments IPN processing must succeed');
    assert.strictEqual(ipnResult.paymentStatus, 'PAID', 'FAIL: Payment status must update to PAID');

    const unlockedOrder = await getOrderByIdAsync(order.orderId);
    assert.ok(unlockedOrder, 'Unlocked order must exist');
    assert.strictEqual(unlockedOrder?.paymentStatus, 'PAID', 'FAIL: Stored order paymentStatus must be PAID');
    assert.strictEqual(unlockedOrder?.status, 'PENDING_F2', 'FAIL: Order status must advance to PENDING_F2 after IPN verification');
    console.log('✓ NOWPayments IPN successfully processed: order marked PAID and unlocked');

    console.log('--- ALL MONEY PATH SMOKE TESTS PASSED ---');
  } finally {
    try {
      await clearAllOrders();
    } catch {}
    try {
      if (fs.existsSync(tempOrdersPath)) {
        fs.unlinkSync(tempOrdersPath);
      }
    } catch {}
  }
}

runMoneyPathTest().catch(err => {
  console.error('❌ Money path smoke test failed:', err);
  process.exit(1);
});
