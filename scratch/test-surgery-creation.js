async function test() {
  console.log('Logging in as doctor@cliniqox.com...');
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'doctor@cliniqox.com',
      password: 'password123'
    })
  });
  
  const loginJson = await loginRes.json();
  if (!loginJson.data) {
    console.error('Login failed:', loginJson);
    return;
  }
  
  const token = loginJson.data.accessToken;
  const hospitalId = loginJson.data.hospitalId;
  console.log('Login successful! Hospital ID:', hospitalId);

  const payload = {
    surgeryName: 'Test Surgery By Doc ' + Date.now(),
    surgeryCode: 'TSBD-' + Math.floor(Math.random() * 10000),
    category: 'General',
    defaultSurgeonFee: 15000
  };

  console.log('Calling POST /surgeries to add a new surgery catalog item...');
  const res = await fetch('http://localhost:3000/api/v1/surgeries', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-hospital-id': hospitalId
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log('Response Status:', res.status);
  console.log('Response Body:', JSON.stringify(data, null, 2));
}

test().catch(console.error);
