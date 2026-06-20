#!/usr/bin/env node
/**
 * Direct Node.js API test - no curl needed
 */

const https = require('http');

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1' + path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('=== 1. Login ===');
  const loginRes = await request('POST', '/auth/login', { username: 'admin@cliniqox.com', password: 'password123' });
  console.log('Status:', loginRes.status);
  console.log('Success:', loginRes.body?.success);
  
  if (!loginRes.body?.success) {
    console.log('Error:', loginRes.body?.error?.message);
    
    // Try manoj_doc
    console.log('\n=== Trying manoj_doc ===');
    const login2 = await request('POST', '/auth/login', { username: 'manoj_doc', password: 'password123' });
    console.log('Status:', login2.status, '| Success:', login2.body?.success);
    if (!login2.body?.success) console.log('Error:', login2.body?.error?.message);
    return;
  }
  
  const token = loginRes.body.data?.accessToken;
  console.log('Token obtained:', token?.length, 'chars');
  console.log('User role:', loginRes.body.data?.role);

  console.log('\n=== 2. List Discount Codes ===');
  const codesRes = await request('GET', '/discount-codes', null, token);
  console.log('Status:', codesRes.status);
  if (codesRes.body?.success) {
    const codes = codesRes.body.data?.discountCodes || [];
    console.log('Total codes:', codes.length);
    codes.forEach(c => console.log(' -', c.code, '|', c.discountType, c.value, '| active:', c.isActive));
  } else {
    console.log('Error:', JSON.stringify(codesRes.body?.error));
  }

  console.log('\n=== 3. Validate Discount Code ===');
  const validateRes = await request('POST', '/discount-codes/validate', { code: 'TEST10' }, token);
  console.log('Status:', validateRes.status);
  console.log('Response:', JSON.stringify(validateRes.body, null, 2));

  console.log('\n=== 4. Estimates ===');
  const estRes = await request('GET', '/estimates?limit=2', null, token);
  console.log('Status:', estRes.status);
  const ests = estRes.body?.data?.estimates || [];
  console.log('Estimates found:', ests.length);
  
  console.log('\n=== ALL TESTS DONE ===');
}

main().catch(console.error);
