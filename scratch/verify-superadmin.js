const BASE_URL = 'http://localhost:3000/api/v1';

async function testSuperAdminFeatures() {
  console.log('--- STARTING SUPER ADMIN E2E TEST ---');

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
  const uniqueCode = 'TEST' + Math.floor(Math.random() * 10000);
  const adminUsername = 'admin_' + uniqueCode.toLowerCase();
  console.log(`\n[STEP 2] Creating hospital tenant with code ${uniqueCode}...`);
  const createHospital = await request(`${BASE_URL}/superadmin/hospitals`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${superToken}` },
    body: JSON.stringify({
      code: uniqueCode,
      name: 'Test Hospital ' + uniqueCode,
      address: '123 Test Street',
      phone: '+919988776655',
      email: 'test@hospital.com',
      adminUsername,
      adminPassword: 'password123'
    })
  });
  if (!createHospital.ok) {
    throw new Error('Create hospital failed: ' + JSON.stringify(createHospital.data));
  }
  const hospitalId = createHospital.data.data.hospital.id;
  console.log('Hospital created successfully! ID:', hospitalId);

  // 3. Verify it is listed
  console.log('\n[STEP 3] Listing hospitals...');
  const listHospitals = await request(`${BASE_URL}/superadmin/hospitals`, {
    headers: { 'Authorization': `Bearer ${superToken}` }
  });
  const found = listHospitals.data.data.hospitals.find(h => h.id === hospitalId);
  if (!found) {
    throw new Error('Created hospital not found in list.');
  }
  console.log('Hospital found in list! Active status:', found.isActive);

  // 4. Toggle Hospital to Inactive
  console.log('\n[STEP 4] Toggling hospital active status to false (Inactive)...');
  const toggleInactive = await request(`${BASE_URL}/superadmin/hospitals/${hospitalId}/status`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${superToken}` },
    body: JSON.stringify({ isActive: false })
  });
  if (!toggleInactive.ok) {
    throw new Error('Toggle inactive failed: ' + JSON.stringify(toggleInactive.data));
  }
  console.log('Status toggled successfully!');

  // 5. Attempt login with hospital admin user (should fail)
  console.log('\n[STEP 5] Attempting login with hospital admin credentials (should fail)...');
  const loginHospitalAdminFail = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username: adminUsername, password: 'password123' })
  });
  console.log('Login Response Status:', loginHospitalAdminFail.status);
  console.log('Login Response Body:', loginHospitalAdminFail.data);
  if (loginHospitalAdminFail.status !== 401 || loginHospitalAdminFail.data.error?.code !== 'ERR_HOSPITAL_INACTIVE') {
    throw new Error('Hospital admin login did not fail as expected with ERR_HOSPITAL_INACTIVE.');
  }
  console.log('Success: Login blocked correctly.');

  // 6. Toggle Hospital to Active
  console.log('\n[STEP 6] Toggling hospital active status to true (Active)...');
  const toggleActive = await request(`${BASE_URL}/superadmin/hospitals/${hospitalId}/status`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${superToken}` },
    body: JSON.stringify({ isActive: true })
  });
  if (!toggleActive.ok) {
    throw new Error('Toggle active failed: ' + JSON.stringify(toggleActive.data));
  }
  console.log('Status toggled successfully!');

  // 7. Attempt login with hospital admin user (should succeed)
  console.log('\n[STEP 7] Attempting login with hospital admin credentials (should succeed)...');
  const loginHospitalAdminSuccess = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username: adminUsername, password: 'password123' })
  });
  if (!loginHospitalAdminSuccess.ok) {
    throw new Error('Hospital admin login failed: ' + JSON.stringify(loginHospitalAdminSuccess.data));
  }
  const hospitalAdminToken = loginHospitalAdminSuccess.data.data.token;
  console.log('Success: Hospital admin logged in successfully!');

  // 8. Delete hospital with no bookings/invoices (should succeed)
  console.log('\n[STEP 8] Soft deleting the hospital with no active bookings/invoices...');
  const deleteHospitalSuccess = await request(`${BASE_URL}/superadmin/hospitals/${hospitalId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${superToken}` }
  });
  if (!deleteHospitalSuccess.ok) {
    throw new Error('Soft delete failed: ' + JSON.stringify(deleteHospitalSuccess.data));
  }
  console.log('Success: Hospital soft deleted successfully!');

  // 9. Re-verify listing excludes the deleted hospital
  console.log('\n[STEP 9] Verifying deleted hospital is excluded from listings...');
  const listHospitalsAfterDelete = await request(`${BASE_URL}/superadmin/hospitals`, {
    headers: { 'Authorization': `Bearer ${superToken}` }
  });
  const deletedFound = listHospitalsAfterDelete.data.data.hospitals.find(h => h.id === hospitalId);
  if (deletedFound) {
    throw new Error('Deleted hospital was still found in list.');
  }
  console.log('Success: Deleted hospital is excluded.');

  // 10. Re-verify login with hospital admin (should now fail because hospital is deleted)
  console.log('\n[STEP 10] Verifying admin login is blocked for deleted hospital...');
  const loginHospitalAdminAfterDelete = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username: adminUsername, password: 'password123' })
  });
  if (loginHospitalAdminAfterDelete.status !== 401 || loginHospitalAdminAfterDelete.data.error?.code !== 'ERR_HOSPITAL_INACTIVE') {
    throw new Error('Hospital admin login did not fail with ERR_HOSPITAL_INACTIVE after deletion.');
  }
  console.log('Success: Login blocked correctly.');

  // --- SECOND HOSPITAL TEST (VALIDATION RULES) ---

  // 11. Create a second hospital tenant
  const uniqueCode2 = 'TEST' + Math.floor(Math.random() * 10000);
  const adminUsername2 = 'admin_' + uniqueCode2.toLowerCase();
  console.log(`\n[STEP 11] Creating second hospital tenant with code ${uniqueCode2}...`);
  const createHospital2 = await request(`${BASE_URL}/superadmin/hospitals`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${superToken}` },
    body: JSON.stringify({
      code: uniqueCode2,
      name: 'Second Test Hospital ' + uniqueCode2,
      address: '123 Test Street',
      phone: '+919988776655',
      email: 'test2@hospital.com',
      adminUsername: adminUsername2,
      adminPassword: 'password123'
    })
  });
  if (!createHospital2.ok) {
    throw new Error('Create hospital 2 failed: ' + JSON.stringify(createHospital2.data));
  }
  const hospitalId2 = createHospital2.data.data.hospital.id;
  console.log('Hospital 2 created! ID:', hospitalId2);

  // 12. Login as Hospital 2 admin
  console.log('\n[STEP 12] Logging in as Hospital 2 admin...');
  const loginHospital2 = await request(`${BASE_URL}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ username: adminUsername2, password: 'password123' })
  });
  if (!loginHospital2.ok) {
    throw new Error('Hospital 2 login failed');
  }
  const token2 = loginHospital2.data.data.token;
  const authHeaders2 = {
    'Authorization': `Bearer ${token2}`,
    'x-hospital-id': hospitalId2
  };

  // 13. Create a patient
  console.log('\n[STEP 13] Creating a patient in Hospital 2...');
  const createPatient = await request(`${BASE_URL}/patients`, {
    method: 'POST',
    headers: authHeaders2,
    body: JSON.stringify({
      name: 'Verification Patient',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      mobile: '+919876543210'
    })
  });
  if (!createPatient.ok) {
    throw new Error('Patient creation failed: ' + JSON.stringify(createPatient.data));
  }
  const patientId = createPatient.data.data.id;
  console.log('Patient created! ID:', patientId);

  // 14. Create a Doctor Profile (needed for calendar booking)
  console.log('\n[STEP 14] Creating a doctor in Hospital 2...');
  const createDoctorUser = await request(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    body: JSON.stringify({
      hospitalCode: uniqueCode2,
      username: 'doctor_' + uniqueCode2.toLowerCase(),
      password: 'password123',
      role: 'DOCTOR'
    })
  });
  if (!createDoctorUser.ok) {
    throw new Error('Doctor user creation failed: ' + JSON.stringify(createDoctorUser.data));
  }
  const doctorUserId = createDoctorUser.data.data.id;

  const createDoctorProfile = await request(`${BASE_URL}/doctors`, {
    method: 'POST',
    headers: authHeaders2,
    body: JSON.stringify({
      userId: doctorUserId,
      firstName: 'Verification',
      lastName: 'Doctor',
      specialty: 'Testing',
      licenseNumber: 'LIC-' + uniqueCode2,
      defaultSurgeonFee: 5000
    })
  });
  if (!createDoctorProfile.ok) {
    throw new Error('Doctor profile creation failed: ' + JSON.stringify(createDoctorProfile.data));
  }
  const doctorId = createDoctorProfile.data.data.id;
  console.log('Doctor profile created! ID:', doctorId);

  // 15. Create a pending calendar booking
  console.log('\n[STEP 15] Creating a pending calendar booking...');
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 24);
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 1);

  const createEvent = await request(`${BASE_URL}/calendar`, {
    method: 'POST',
    headers: authHeaders2,
    body: JSON.stringify({
      eventType: 'SURGERY',
      title: 'Test Surgery event',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      doctorId,
      patientId
    })
  });
  if (!createEvent.ok) {
    throw new Error('Calendar booking failed: ' + JSON.stringify(createEvent.data));
  }
  const eventId = createEvent.data.data.id;
  console.log('Calendar event created! ID:', eventId);

  // 16. Attempt to delete Hospital 2 (should fail due to active booking)
  console.log('\n[STEP 16] Attempting to delete Hospital 2 (should fail due to active booking)...');
  const deleteHospital2Fail = await request(`${BASE_URL}/superadmin/hospitals/${hospitalId2}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${superToken}` }
  });
  console.log('Delete Response Status:', deleteHospital2Fail.status);
  console.log('Delete Response Body:', deleteHospital2Fail.data);
  if (deleteHospital2Fail.status !== 400 || deleteHospital2Fail.data.error?.code !== 'ERR_ACTIVE_DEPENDENCIES') {
    throw new Error('Delete did not fail as expected with ERR_ACTIVE_DEPENDENCIES.');
  }
  console.log('Success: Deletion correctly blocked.');

  // 17. Cancel the event in Hospital 2
  console.log('\n[STEP 17] Cancelling the calendar event...');
  const cancelEvent = await request(`${BASE_URL}/calendar/${eventId}`, {
    method: 'DELETE',
    headers: authHeaders2
  });
  if (!cancelEvent.ok) {
    throw new Error('Event cancellation failed: ' + JSON.stringify(cancelEvent.data));
  }
  console.log('Event cancelled successfully!');

  // 18. Attempt to delete Hospital 2 again (should now succeed)
  console.log('\n[STEP 18] Attempting to delete Hospital 2 again (should succeed)...');
  const deleteHospital2Success = await request(`${BASE_URL}/superadmin/hospitals/${hospitalId2}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${superToken}` }
  });
  if (!deleteHospital2Success.ok) {
    throw new Error('Soft delete 2 failed: ' + JSON.stringify(deleteHospital2Success.data));
  }
  console.log('Success: Hospital 2 soft deleted successfully!');

  console.log('\n--- ALL SUPER ADMIN E2E TESTS COMPLETED SUCCESSFULLY! ---');
}

testSuperAdminFeatures().catch(err => {
  console.error('\nTest failed with error:', err);
  process.exit(1);
});
