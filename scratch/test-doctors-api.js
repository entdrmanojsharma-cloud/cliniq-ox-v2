async function test() {
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'doctor@cliniqox.com',
      password: 'password123'
    })
  });
  
  const loginJson = await loginRes.json();
  console.log('Login Result:', loginJson);
  
  if (!loginJson.data) {
    console.log('Login failed!');
    return;
  }
  
  const token = loginJson.data.accessToken;
  const hospitalId = loginJson.data.hospitalId;
  
  const doctorsRes = await fetch('http://localhost:3000/api/v1/doctors?limit=100', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-hospital-id': hospitalId
    }
  });
  
  const doctorsJson = await doctorsRes.json();
  console.log('Doctors API Result:', JSON.stringify(doctorsJson, null, 2));
}

test().catch(err => console.error(err));
