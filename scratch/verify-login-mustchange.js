const BASE_URL = 'http://localhost:3000/api/v1';

async function testLoginMustChange() {
  console.log('--- STARTING LOGIN MUSTCHANGE STACK TEST ---');

  const adminUsername = 'admin_test_stats_new';
  console.log(`Logging in as: "${adminUsername}"`);
  
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: adminUsername,
      password: 'adminpassword123'
    })
  });
  
  const loginData = await loginRes.json();
  console.log('Login status:', loginRes.status);
  console.log('Response mustChangePassword flag:', loginData.data?.mustChangePassword);

  if (loginData.data?.mustChangePassword === true) {
    throw new Error('Test failed: mustChangePassword is still true!');
  }
  
  console.log('Test passed: mustChangePassword is false!');
  console.log('\n--- SUCCESS ---');
}

testLoginMustChange().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
