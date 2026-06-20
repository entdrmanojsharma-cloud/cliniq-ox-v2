const BASE_URL = 'http://localhost:3000/api/v1';

async function testUsernameVerification() {
  console.log('--- STARTING USERNAME VERIFICATION ENDPOINT TEST ---');

  // Test 1: Existing username
  const existingUsername = 'admin_test_stats_new';
  console.log(`\n[TEST 1] Verifying existing user: "${existingUsername}"`);
  const res1 = await fetch(`${BASE_URL}/auth/verify-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: existingUsername })
  });
  const data1 = await res1.json();
  console.log('Status:', res1.status);
  console.log('Response:', JSON.stringify(data1));
  if (!res1.ok || !data1.success || data1.data.exists !== true) {
    throw new Error('Test 1 failed: expected exists = true');
  }
  console.log('Test 1 passed successfully!');

  // Test 2: Non-existent username
  const missingUsername = 'non_existent_user_abc_123';
  console.log(`\n[TEST 2] Verifying non-existent user: "${missingUsername}"`);
  const res2 = await fetch(`${BASE_URL}/auth/verify-username`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: missingUsername })
  });
  const data2 = await res2.json();
  console.log('Status:', res2.status);
  console.log('Response:', JSON.stringify(data2));
  if (!res2.ok || !data2.success || data2.data.exists !== false) {
    throw new Error('Test 2 failed: expected exists = false');
  }
  console.log('Test 2 passed successfully!');

  console.log('\n--- ALL TESTS PASSED SUCCESSFULLY! ---');
}

testUsernameVerification().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
