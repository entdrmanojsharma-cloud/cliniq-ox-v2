async function main() {
  const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data.token;

  const res = await fetch('http://localhost:3000/api/v1/superadmin/hospitals/a3c80c27-61c9-4c77-a6e6-2aeef114b67f/status', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ isActive: false })
  });
  console.log('Status Code:', res.status);
  const text = await res.text();
  console.log('Response Body:', text);
}
main();
