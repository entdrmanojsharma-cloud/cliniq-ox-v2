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
  
  const refreshToken = loginJson.data.refreshToken;
  console.log('Using Refresh Token:', refreshToken);
  
  const refreshRes = await fetch('http://localhost:3000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });
  
  const refreshJson = await refreshRes.json();
  console.log('Refresh Result:', refreshJson);
}

test().catch(err => console.error(err));
