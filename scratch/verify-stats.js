const BASE_URL = 'http://localhost:3000/api/v1';

async function verifyStats() {
  console.log('--- STARTING STATS ENDPOINT VERIFICATION ---');

  // 1. SIGNUP OR LOGIN ADMIN
  const adminUsername = `admin_test_stats_new`;
  let token = '';
  let hospitalId = '';

  console.log('Attempting login...');
  try {
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: adminUsername,
        password: 'adminpassword123'
      })
    });
    if (loginRes.ok) {
      const loginData = await loginRes.json();
      token = loginData.data.token;
      hospitalId = loginData.data.hospitalId;
      console.log('Admin login successful!');
    } else {
      const loginError = await loginRes.json();
      console.log('Login failed:', JSON.stringify(loginError), 'Attempting signup...');
      const signupAdminRes = await fetch(`${BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalCode: 'RMEE2225901',
          username: adminUsername,
          password: 'adminpassword123',
          role: 'ADMIN'
        })
      });
      const signupAdminData = await signupAdminRes.json();
      if (!signupAdminRes.ok) {
        console.error('Admin signup failed response:', JSON.stringify(signupAdminData));
        throw new Error('Admin signup failed');
      }
      token = signupAdminData.data.token;
      hospitalId = signupAdminData.data.hospitalId;
      console.log('Admin signup successful!');
    }
  } catch (err) {
    console.error('Auth setup failed:', err.message);
    process.exit(1);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-hospital-id': hospitalId
  };

  // 2. FETCH DEFAULT STATS (TODAY)
  console.log('\n[STEP 1] Fetching default stats (Today)...');
  const res1 = await fetch(`${BASE_URL}/dashboard/stats`, { headers: authHeaders });
  console.log('Response status:', res1.status);
  const text1 = await res1.text();
  console.log('Raw text response:', text1);
  let data1;
  try {
    data1 = JSON.parse(text1);
  } catch (e) {
    console.error('Failed to parse stats response as JSON:', e.message);
  }
  if (!res1.ok) throw new Error('Fetching default stats failed');

  // 3. FETCH HISTORICAL STATS (LAST YEAR RANGE)
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setDate(today.getDate() - 365);
  const format = (d) => d.toISOString().split('T')[0];

  const fromStr = format(oneYearAgo);
  const toStr = format(today);

  console.log(`\n[STEP 2] Fetching stats for date range: ${fromStr} to ${toStr}...`);
  const res2 = await fetch(`${BASE_URL}/dashboard/stats?from=${fromStr}&to=${toStr}`, { headers: authHeaders });
  const data2 = await res2.json();
  console.log('Response status:', res2.status);
  console.log('Historical stats Data:', JSON.stringify(data2, null, 2));
  if (!res2.ok) throw new Error('Fetching historical stats failed');

  console.log('\n--- VERIFICATION SUCCESSFUL ---');
}

verifyStats().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
