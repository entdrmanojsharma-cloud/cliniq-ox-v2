/*
  Purpose: Integration and E2E API tests for the Master Data Import System (Data Management).
  Responsibility: Authenticate test admin, run validate and import APIs for Surgery, Diagnosis, and Staff masters using dynamically generated Excel buffers, and verify db states.
*/

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const xlsx = require('xlsx');

const BASE_URL = 'http://localhost:3000/api/v1';

async function runTests() {
  console.log('--- STARTING MASTER DATA IMPORT SYSTEM INTEGRATION TESTS ---');

  try {
    const timestamp = Date.now();
    const codeSurg1 = `SURG_${timestamp}_1`;
    const codeSurg2 = `SURG_${timestamp}_2`;
    const codeSurg3 = `SURG_${timestamp}_3`;

    const codeDiag1 = `DIAG_${timestamp}_1`;
    const codeDiag2 = `DIAG_${timestamp}_2`;

    // 1. Authenticate / Login Admin
    const adminEmail = `import_admin_${timestamp}@cliniqox.com`;
    console.log(`\n[STEP 1] Registering Admin for testing: ${adminEmail}`);
    const signupAdminRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'CLKOX',
        username: adminEmail,
        password: 'adminpassword123',
        role: 'ADMIN'
      })
    });
    const signupAdminData = await signupAdminRes.json();
    if (!signupAdminRes.ok) throw new Error(`Admin signup failed: ${JSON.stringify(signupAdminData)}`);

    console.log('Logging in Admin...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hospitalCode: 'CLKOX',
        username: adminEmail,
        password: 'adminpassword123'
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error(`Admin login failed: ${JSON.stringify(loginData)}`);
    const token = loginData.data.accessToken || loginData.data.token;
    const hospitalId = loginData.data.hospitalId;

    const authHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-hospital-id': hospitalId
    };

    // 2. Download Sample template
    console.log('\n[STEP 2] Downloading sample templates...');
    const downloadRes = await fetch(`${BASE_URL}/data-management/sample?importType=SURGERY`, {
      headers: authHeaders
    });
    if (!downloadRes.ok) throw new Error('Failed to download Surgery sample template');
    const templateBuffer = await downloadRes.arrayBuffer();
    console.log('Surgery sample template downloaded successfully. Buffer size:', templateBuffer.byteLength);

    // 3. Test Surgery Master Import
    console.log('\n[STEP 3] Validating and Importing Surgeries...');
    // Create Excel sheet with SheetJS
    const surgWorkbook = xlsx.utils.book_new();
    const surgRows = [
      { 'Surgery Code': codeSurg1, 'Surgery Name': 'Test Appendectomy', 'Category': 'General', 'Default Surgeon Fee': 15000 },
      { 'Surgery Code': codeSurg2, 'Surgery Name': 'Test Cataract', 'Category': 'Ophthalmology', 'Default Surgeon Fee': 12000 }
    ];
    const surgSheet = xlsx.utils.json_to_sheet(surgRows, { header: ['Surgery Code', 'Surgery Name', 'Category', 'Default Surgeon Fee'] });
    xlsx.utils.book_append_sheet(surgWorkbook, surgSheet, 'Surgeries');
    const surgBuffer = xlsx.write(surgWorkbook, { type: 'buffer', bookType: 'xlsx' });
    const surgBase64 = surgBuffer.toString('base64');

    console.log('Sending surgeries Excel for validation...');
    const valSurgRes = await fetch(`${BASE_URL}/data-management/validate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        importType: 'SURGERY',
        fileData: surgBase64
      })
    });
    const valSurgData = await valSurgRes.json();
    if (!valSurgRes.ok) throw new Error(`Surgery validation failed: ${JSON.stringify(valSurgData)}`);
    console.log('Validation report preview:', {
      toAddCount: valSurgData.data.toAdd.length,
      toUpdateCount: valSurgData.data.toUpdate.length,
      errorsCount: valSurgData.data.errors.length
    });

    if (valSurgData.data.toAdd.length !== 2 || valSurgData.data.errors.length !== 0) {
      throw new Error('Validation report does not match expected counts for new surgeries');
    }

    console.log('Committing surgeries import...');
    const importSurgRes = await fetch(`${BASE_URL}/data-management/import`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        importType: 'SURGERY',
        fileName: 'test_surgeries.xlsx',
        validatedData: valSurgData.data
      })
    });
    const importSurgData = await importSurgRes.json();
    if (!importSurgRes.ok) throw new Error(`Surgery import failed: ${JSON.stringify(importSurgData)}`);
    console.log('Import results:', importSurgData.data.message);

    // Verify DB
    const dbSurgeries = await prisma.surgeryMaster.findMany({
      where: { hospitalId, surgeryCode: { in: [codeSurg1, codeSurg2] } }
    });
    console.log(`Verified DB: Found ${dbSurgeries.length} inserted surgeries`);
    if (dbSurgeries.length !== 2) throw new Error('DB verification failed for surgeries');

    // 4. Test Matching / Merging Updates
    console.log('\n[STEP 4] Testing Matching & Merging Updates...');
    const matchWorkbook = xlsx.utils.book_new();
    const matchRows = [
      { 'Surgery Code': codeSurg1, 'Surgery Name': 'Test Appendectomy Updated', 'Category': 'General', 'Default Surgeon Fee': 18000 },
      { 'Surgery Code': codeSurg3, 'Surgery Name': 'Test Hernia', 'Category': 'General', 'Default Surgeon Fee': 20000 }
    ];
    const matchSheet = xlsx.utils.json_to_sheet(matchRows, { header: ['Surgery Code', 'Surgery Name', 'Category', 'Default Surgeon Fee'] });
    xlsx.utils.book_append_sheet(matchWorkbook, matchSheet, 'Surgeries');
    const matchBuffer = xlsx.write(matchWorkbook, { type: 'buffer', bookType: 'xlsx' });
    const matchBase64 = matchBuffer.toString('base64');

    const valMatchRes = await fetch(`${BASE_URL}/data-management/validate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        importType: 'SURGERY',
        fileData: matchBase64
      })
    });
    const valMatchData = await valMatchRes.json();
    if (!valMatchRes.ok) throw new Error(`Match validation failed: ${JSON.stringify(valMatchData)}`);
    console.log('Match report preview:', {
      toAddCount: valMatchData.data.toAdd.length,
      toUpdateCount: valMatchData.data.toUpdate.length,
      errorsCount: valMatchData.data.errors.length
    });

    if (valMatchData.data.toAdd.length !== 1 || valMatchData.data.toUpdate.length !== 1) {
      throw new Error('Match validation report counts mismatch');
    }

    console.log('Committing matching/merging updates...');
    const importMatchRes = await fetch(`${BASE_URL}/data-management/import`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        importType: 'SURGERY',
        fileName: 'test_surgeries_match.xlsx',
        validatedData: valMatchData.data
      })
    });
    if (!importMatchRes.ok) throw new Error('Match import commit failed');

    // Verify DB
    const appendectomy = await prisma.surgeryMaster.findFirst({
      where: { hospitalId, surgeryCode: codeSurg1 }
    });
    console.log('Appendectomy after update fee:', appendectomy.defaultSurgeonFee, 'name:', appendectomy.surgeryName);
    if (Number(appendectomy.defaultSurgeonFee) !== 18000 || appendectomy.surgeryName !== 'Test Appendectomy Updated') {
      throw new Error('Appendectomy matching/merge update failed');
    }

    // 5. Test Validation Errors
    console.log('\n[STEP 5] Testing Validation Errors handling...');
    const errWorkbook = xlsx.utils.book_new();
    const errRows = [
      { 'Surgery Code': '', 'Surgery Name': 'Missing Code', 'Category': 'General', 'Default Surgeon Fee': 10000 },
      { 'Surgery Code': `ERRSURG_${timestamp}_5`, 'Surgery Name': '', 'Category': 'General', 'Default Surgeon Fee': 10000 },
      { 'Surgery Code': `ERRSURG_${timestamp}_6`, 'Surgery Name': 'Invalid Fee', 'Category': 'General', 'Default Surgeon Fee': 'invalid_fee' },
      { 'Surgery Code': `ERRSURG_${timestamp}_7`, 'Surgery Name': 'Duplicate Code', 'Category': 'General', 'Default Surgeon Fee': 10000 },
      { 'Surgery Code': `ERRSURG_${timestamp}_7`, 'Surgery Name': 'Duplicate Code Second', 'Category': 'General', 'Default Surgeon Fee': 10000 }
    ];
    const errSheet = xlsx.utils.json_to_sheet(errRows);
    xlsx.utils.book_append_sheet(errWorkbook, errSheet, 'Surgeries');
    const errBuffer = xlsx.write(errWorkbook, { type: 'buffer', bookType: 'xlsx' });
    const errBase64 = errBuffer.toString('base64');

    const valErrRes = await fetch(`${BASE_URL}/data-management/validate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        importType: 'SURGERY',
        fileData: errBase64
      })
    });
    const valErrData = await valErrRes.json();
    if (!valErrRes.ok) throw new Error('Error validation API request failed');
    console.log('Errors count in validation report:', valErrData.data.errors.length);
    if (valErrData.data.errors.length !== 4) {
      throw new Error(`Expected 4 validation errors, found: ${valErrData.data.errors.length}`);
    }

    // 6. Test Diagnosis Master Import
    console.log('\n[STEP 6] Validating and Importing Diagnosis Master...');
    const diagWorkbook = xlsx.utils.book_new();
    const diagRows = [
      { 'Diagnosis Code': codeDiag1, 'Diagnosis Name': 'Test Acute Appendicitis' },
      { 'Diagnosis Code': codeDiag2, 'Diagnosis Name': 'Test Senile Cataract' }
    ];
    const diagSheet = xlsx.utils.json_to_sheet(diagRows, { header: ['Diagnosis Code', 'Diagnosis Name'] });
    xlsx.utils.book_append_sheet(diagWorkbook, diagSheet, 'Diagnoses');
    const diagBuffer = xlsx.write(diagWorkbook, { type: 'buffer', bookType: 'xlsx' });
    const diagBase64 = diagBuffer.toString('base64');

    const valDiagRes = await fetch(`${BASE_URL}/data-management/validate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        importType: 'DIAGNOSIS',
        fileData: diagBase64
      })
    });
    const valDiagData = await valDiagRes.json();
    if (!valDiagRes.ok) throw new Error(`Diagnosis validation failed: ${JSON.stringify(valDiagData)}`);

    console.log('Committing diagnosis import...');
    const importDiagRes = await fetch(`${BASE_URL}/data-management/import`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        importType: 'DIAGNOSIS',
        fileName: 'test_diagnoses.xlsx',
        validatedData: valDiagData.data
      })
    });
    if (!importDiagRes.ok) throw new Error('Diagnosis import commit failed');

    // Verify DB
    const dbDiagnoses = await prisma.diagnosisMaster.findMany({
      where: { hospitalId, diagnosisCode: { in: [codeDiag1, codeDiag2] } }
    });
    console.log(`Verified DB: Found ${dbDiagnoses.length} inserted diagnoses`);
    if (dbDiagnoses.length !== 2) throw new Error('DB verification failed for diagnoses');

    // 7. Test Staff Master Import (Logins + Doctor Profiles)
    console.log('\n[STEP 7] Validating and Importing Staff Master...');
    const staffWorkbook = xlsx.utils.book_new();
    const testUsernameDoc = `test_doctor_${timestamp}`;
    const testUsernameNurse = `test_nurse_${timestamp}`;

    const staffRows = [
      {
        'First Name': 'Test',
        'Last Name': 'Doctor',
        'Username': testUsernameDoc,
        'Password': 'password123',
        'Staff Type': 'Doctor',
        'Specialty': 'General Surgery',
        'Department': 'OT',
        'License Number': 'DOC999'
      },
      {
        'First Name': 'Test',
        'Last Name': 'Nurse',
        'Username': testUsernameNurse,
        'Password': 'password123',
        'Staff Type': 'Nurse',
        'Specialty': '',
        'Department': 'Ward',
        'License Number': ''
      }
    ];
    const staffSheet = xlsx.utils.json_to_sheet(staffRows, { header: ['First Name', 'Last Name', 'Username', 'Password', 'Staff Type', 'Specialty', 'Department', 'License Number'] });
    xlsx.utils.book_append_sheet(staffWorkbook, staffSheet, 'Staff');
    const staffBuffer = xlsx.write(staffWorkbook, { type: 'buffer', bookType: 'xlsx' });
    const staffBase64 = staffBuffer.toString('base64');

    const valStaffRes = await fetch(`${BASE_URL}/data-management/validate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        importType: 'STAFF',
        fileData: staffBase64
      })
    });
    const valStaffData = await valStaffRes.json();
    if (!valStaffRes.ok) throw new Error(`Staff validation failed: ${JSON.stringify(valStaffData)}`);

    console.log('Committing staff import...');
    const importStaffRes = await fetch(`${BASE_URL}/data-management/import`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        importType: 'STAFF',
        fileName: 'test_staff.xlsx',
        validatedData: valStaffData.data
      })
    });
    if (!importStaffRes.ok) throw new Error('Staff import commit failed');

    // Verify DB
    const dbDocUser = await prisma.user.findFirst({
      where: { username: testUsernameDoc },
      include: { doctorProfile: true }
    });
    const dbNurseUser = await prisma.user.findFirst({
      where: { username: testUsernameNurse },
      include: { doctorProfile: true }
    });

    console.log('Doctor User role in DB:', dbDocUser?.role, 'Staff Type:', dbDocUser?.staffType, 'Has Doctor profile?:', !!dbDocUser?.doctorProfile);
    console.log('Nurse User role in DB:', dbNurseUser?.role, 'Staff Type:', dbNurseUser?.staffType, 'Has Doctor profile?:', !!dbNurseUser?.doctorProfile);

    if (dbDocUser?.role !== 'DOCTOR' || !dbDocUser?.doctorProfile) {
      throw new Error('Doctor staff import failed to create doctor profile');
    }
    if (dbNurseUser?.role !== 'RECEPTIONIST' || dbNurseUser?.doctorProfile) {
      throw new Error('Nurse staff import incorrectly profiled or mapped');
    }

    // 8. Test Global Username Collision
    console.log('\n[STEP 8] Testing Global Username Collision...');
    const collisionWorkbook = xlsx.utils.book_new();
    const collisionRows = [
      {
        'First Name': 'Collision',
        'Last Name': 'User',
        'Username': testUsernameDoc, // Existing username
        'Password': 'password123',
        'Staff Type': 'Nurse',
        'Specialty': '',
        'Department': '',
        'License Number': ''
      }
    ];
    const collisionSheet = xlsx.utils.json_to_sheet(collisionRows);
    xlsx.utils.book_append_sheet(collisionWorkbook, collisionSheet, 'Staff');
    const collisionBuffer = xlsx.write(collisionWorkbook, { type: 'buffer', bookType: 'xlsx' });
    const collisionBase64 = collisionBuffer.toString('base64');

    const valCollRes = await fetch(`${BASE_URL}/data-management/validate`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        importType: 'STAFF',
        fileData: collisionBase64
      })
    });
    const valCollData = await valCollRes.json();
    console.log('Username collision validation preview:', {
      toAdd: valCollData.data.toAdd.length,
      toUpdate: valCollData.data.toUpdate.length,
      errors: valCollData.data.errors.length
    });

    // Since testUsernameDoc belongs to the same hospital, it will be validated as toUpdate.
    // Let's verify it maps correctly.
    if (valCollData.data.toUpdate.length !== 1 || valCollData.data.errors.length !== 0) {
      throw new Error('Same hospital username update validation failed');
    }

    // 9. Fetch History Logs
    console.log('\n[STEP 9] Fetching Import History logs...');
    const histRes = await fetch(`${BASE_URL}/data-management/history?importType=SURGERY`, {
      headers: authHeaders
    });
    const histData = await histRes.json();
    if (!histRes.ok) throw new Error('Failed to fetch import history logs');
    console.log('History logs count:', histData.data.length);
    if (histData.data.length < 2) {
      throw new Error('Expected at least 2 history log entries for surgery import');
    }

    console.log('\n--- ALL MASTER DATA IMPORT INTEGRATION TESTS COMPLETED SUCCESSFULLY! ---');
  } catch (error) {
    console.error('\n❌ TEST RUN FAILED WITH ERROR:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
