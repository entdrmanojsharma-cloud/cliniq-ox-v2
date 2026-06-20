const BASE_URL = 'http://localhost:3000/api/v1';

async function main() {
  console.log('Logging in as doctor@cliniqox.com...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'doctor@cliniqox.com',
      password: 'password123'
    })
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok) {
    console.error('Login failed:', loginData);
    return;
  }
  const token = loginData.data.accessToken;
  const hospitalId = loginData.data.hospitalId;
  console.log('Login successful! Hospital ID:', hospitalId);

  console.log('Calling GET /doctors...');
  const doctorsRes = await fetch(`${BASE_URL}/doctors?limit=100`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-hospital-id': hospitalId
    }
  });
  const doctorsData = await doctorsRes.json();
  console.log('Doctors API Response:', JSON.stringify(doctorsData, null, 2));
}

main().catch(console.error);
