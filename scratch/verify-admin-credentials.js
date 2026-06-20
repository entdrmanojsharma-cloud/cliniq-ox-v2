const BASE_URL = 'http://localhost:3000/api/v1';

async function testAdminCredentialsFlow() {
  console.log('--- STARTING ADMIN CREDENTIALS FLOW TEST ---');

  // Helper to request JSON
  async function request(url, options = {}) {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    const json = await res.json();
    return { status: res.status, ok: res.ok, data: json };
  }

  // 1. Login as default Super Admin (admin/admin)
  console.log('\n[STEP 1] Logging in as Super Admin...');
  const loginSuper = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin' })
  });
  if (!loginSuper.ok) {
    throw new Error('Super Admin login failed: ' + JSON.stringify(loginSuper.data));
  }
  const superToken = loginSuper.data.data.token;
  console.log('Super Admin logged in successfully!');

  // 2. Create a new hospital tenant
  const uniqueCode = 'CRED' + Math.floor(Math.random() * 10000);
  const adminUsername = 'admin_' + uniqueCode.toLowerCase();
  const initialPassword = 'superSecurePass123';
  console.log(`\n[STEP 2] Creating hospital tenant with code ${uniqueCode}...`);
  const createHospital = await request(`${BASE_URL}/superadmin/hospitals`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${superToken}` },
    body: JSON.stringify({
      code: uniqueCode,
      name: 'Credentials Test Hospital ' + uniqueCode,
      address: '123 Credentials Street',
      phone: '+919988776655',
      email: 'cred@hospital.com',
      adminUsername,
      adminPassword: initialPassword
    })
  });
  if (!createHospital.ok) {
    throw new Error('Create hospital failed: ' + JSON.stringify(createHospital.data));
  }
  const hospitalId = createHospital.data.data.hospital.id;
  console.log('Hospital created successfully! ID:', hospitalId);

  // 3. List hospitals and check for credentials
  console.log('\n[STEP 3] Listing hospitals to verify stored admin credentials...');
  const listHospitals = await request(`${BASE_URL}/superadmin/hospitals`, {
    headers: { 'Authorization': `Bearer ${superToken}` }
  });
  const found = listHospitals.data.data.hospitals.find(h => h.id === hospitalId);
  if (!found) {
    throw new Error('Created hospital not found in list.');
  }
  console.log('Hospital found in list! Checking users array...');
  if (!found.users || found.users.length === 0) {
    throw new Error('No users returned for the hospital in the list response.');
  }
  const adminUser = found.users[0];
  console.log('Returned Admin Username:', adminUser.username);
  console.log('Returned Admin plainPassword:', adminUser.plainPassword);
  if (adminUser.username !== adminUsername) {
    throw new Error(`Username mismatch. Expected: ${adminUsername}, Got: ${adminUser.username}`);
  }
  if (adminUser.plainPassword !== initialPassword) {
    throw new Error(`Password mismatch. Expected: ${initialPassword}, Got: ${adminUser.plainPassword}`);
  }
  console.log('Success: Username and plainPassword match initial credentials!');

  // 4. Request password recovery for this admin user
  console.log('\n[STEP 4] Submitting password reset request for admin user...');
  const resetRequest = await request(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ username: adminUsername })
  });
  if (!resetRequest.ok) {
    throw new Error('ForgotPassword request failed: ' + JSON.stringify(resetRequest.data));
  }
  const requestId = resetRequest.data.data.requestId;
  console.log('Password reset request submitted successfully. Request ID:', requestId);

  // 5. Approve password recovery request as Super Admin
  console.log('\n[STEP 5] Approving reset request as Super Admin...');
  const approveRequest = await request(`${BASE_URL}/superadmin/resolve-reset`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${superToken}` },
    body: JSON.stringify({ requestId, action: 'APPROVE' })
  });
  if (!approveRequest.ok) {
    throw new Error('Approve reset request failed: ' + JSON.stringify(approveRequest.data));
  }
  const tempPassword = approveRequest.data.data.tempPassword;
  console.log('Approve response tempPassword:', tempPassword);

  // 6. Verify plainPassword has been updated in hospital listing
  console.log('\n[STEP 6] Re-listing hospitals to verify temp password update...');
  const listHospitalsAfterReset = await request(`${BASE_URL}/superadmin/hospitals`, {
    headers: { 'Authorization': `Bearer ${superToken}` }
  });
  const foundAfterReset = listHospitalsAfterReset.data.data.hospitals.find(h => h.id === hospitalId);
  const adminUserAfterReset = foundAfterReset.users[0];
  console.log('New plainPassword in list:', adminUserAfterReset.plainPassword);
  if (adminUserAfterReset.plainPassword !== tempPassword) {
    throw new Error(`Password mismatch after reset. Expected: ${tempPassword}, Got: ${adminUserAfterReset.plainPassword}`);
  }
  console.log('Success: plainPassword was updated to temp password successfully!');

  // 7. Login as hospital admin with temporary password
  console.log('\n[STEP 7] Logging in as hospital admin with temporary password...');
  const loginHospitalAdmin = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username: adminUsername, password: tempPassword })
  });
  if (!loginHospitalAdmin.ok) {
    throw new Error('Hospital admin login failed: ' + JSON.stringify(loginHospitalAdmin.data));
  }
  const adminToken = loginHospitalAdmin.data.data.token;
  console.log('Hospital admin logged in successfully!');

  // 8. Change password
  console.log('\n[STEP 8] Changing password for the hospital admin...');
  const newPassword = 'totallyNewPassword456';
  const changePassword = await request(`${BASE_URL}/auth/change-password`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ newPassword })
  });
  if (!changePassword.ok) {
    throw new Error('Change password failed: ' + JSON.stringify(changePassword.data));
  }
  console.log('Password changed successfully!');

  // 9. Re-verify plainPassword in hospital listing has been updated to new password
  console.log('\n[STEP 9] Re-listing hospitals to verify new password is sync\'d...');
  const listHospitalsAfterChange = await request(`${BASE_URL}/superadmin/hospitals`, {
    headers: { 'Authorization': `Bearer ${superToken}` }
  });
  const foundAfterChange = listHospitalsAfterChange.data.data.hospitals.find(h => h.id === hospitalId);
  const adminUserAfterChange = foundAfterChange.users[0];
  console.log('New plainPassword in list:', adminUserAfterChange.plainPassword);
  if (adminUserAfterChange.plainPassword !== newPassword) {
    throw new Error(`Password mismatch after change. Expected: ${newPassword}, Got: ${adminUserAfterChange.plainPassword}`);
  }
  console.log('Success: plainPassword was updated to new password successfully!');

  // 10. Clean up / Soft delete test hospital
  console.log('\n[STEP 10] Deleting test hospital...');
  const deleteHospital = await request(`${BASE_URL}/superadmin/hospitals/${hospitalId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${superToken}` }
  });
  if (!deleteHospital.ok) {
    throw new Error('Failed to delete hospital: ' + JSON.stringify(deleteHospital.data));
  }
  console.log('Success: Test hospital deleted successfully.');

  console.log('\n--- ALL CREDENTIALS FLOW TESTS PASSED SUCCESSFULLY! ---');
}

testAdminCredentialsFlow().catch(err => {
  console.error('\nTest failed with error:', err);
  process.exit(1);
});
