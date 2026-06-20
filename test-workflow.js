const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_URL = 'http://localhost:3000/api/v1';

async function runWorkflow() {
  console.log('--- STARTING E2E WORKFLOW ---');

  // 1. SIGNUP ADMIN
  const adminEmail = `admin_test_${Date.now()}@cliniqox.com`;
  console.log(`\n[STEP 1] Signing up Admin: ${adminEmail}`);
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
  console.log('Admin Signup Response:', signupAdminData);
  if (!signupAdminRes.ok) throw new Error('Admin signup failed');

  // 2. LOGIN ADMIN
  console.log('\n[STEP 2] Logging in Admin...');
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
  console.log('Admin Login Response:', loginData);
  if (!loginRes.ok) throw new Error('Admin login failed');
  const token = loginData.data.accessToken || loginData.data.token;
  const hospitalId = loginData.data.hospitalId;

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-hospital-id': hospitalId
  };

  // 3. SIGNUP DOCTOR USER & CREATE DOCTOR PROFILE
  const doctorEmail = `doctor_test_${Date.now()}@cliniqox.com`;
  console.log(`\n[STEP 3] Signing up Doctor User: ${doctorEmail}`);
  const signupDoctorRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospitalCode: 'CLKOX',
      username: doctorEmail,
      password: 'doctorpassword123',
      role: 'DOCTOR'
    })
  });
  const signupDoctorData = await signupDoctorRes.json();
  console.log('Doctor User Signup Response:', signupDoctorData);
  if (!signupDoctorRes.ok) throw new Error('Doctor user signup failed');
  const doctorUserId = signupDoctorData.data.id;

  console.log('\nCreating Doctor Profile...');
  let doctorId;
  const doctorProfileRes = await fetch(`${BASE_URL}/doctors`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      userId: doctorUserId,
      firstName: 'Sarah',
      lastName: 'Conner',
      specialty: 'General Surgery',
      licenseNumber: `LIC-${Date.now()}`,
      defaultSurgeonFee: 25000
    })
  });
  const doctorProfileData = await doctorProfileRes.json();
  console.log('Doctor Profile Response:', doctorProfileData);
  if (doctorProfileRes.ok) {
    doctorId = doctorProfileData.data.id;
  } else if (doctorProfileData.error?.code === 'ERR_USER_ALREADY_PROFILED') {
    console.log('Doctor profile already exists. Fetching from database...');
    const doc = await prisma.doctor.findFirst({ where: { userId: doctorUserId } });
    doctorId = doc.id;
    console.log('Found Doctor ID:', doctorId);
  } else {
    throw new Error('Doctor profile creation failed');
  }

  // 4. CREATE PATIENT
  console.log('\n[STEP 4] Creating Patient...');
  const patientRes = await fetch(`${BASE_URL}/patients`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'John Doe',
      dateOfBirth: '1985-05-15',
      gender: 'MALE',
      mobile: '+919900990099',
      address: '123 Meadow Lane',
      referringDoctor: 'Dr. Sarah Conner'
    })
  });
  const patientData = await patientRes.json();
  console.log('Patient Response:', patientData);
  if (!patientRes.ok) throw new Error('Patient creation failed');
  const patientId = patientData.data.id;

  // 5. FETCH SURGERIES CATALOG
  console.log('\n[STEP 5] Fetching Surgeries Catalog...');
  const surgeriesRes = await fetch(`${BASE_URL}/surgeries`, {
    headers: authHeaders
  });
  const surgeriesData = await surgeriesRes.json();
  console.log('Surgeries Catalog Response:', surgeriesData);
  if (!surgeriesRes.ok || surgeriesData.data.surgeries.length === 0) {
    throw new Error('No surgeries available or list failed');
  }
  const surgeryId = surgeriesData.data.surgeries[0].id;

  // 6. CREATE CALENDAR BOOKING
  console.log('\n[STEP 6] Booking Calendar Event...');
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 24);
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 2);

  const eventRes = await fetch(`${BASE_URL}/calendar`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      eventType: 'SURGERY',
      title: 'Appendectomy Booking',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      doctorId: doctorId,
      patientId: patientId
    })
  });
  const eventData = await eventRes.json();
  console.log('Calendar Event Response:', eventData);
  if (!eventRes.ok) throw new Error('Calendar event booking failed');
  const eventId = eventData.data.id;

  // 7. CREATE ESTIMATE
  console.log('\n[STEP 7] Creating Estimate...');
  const estimateRes = await fetch(`${BASE_URL}/estimates`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      eventId: eventId,
      expectedStayDays: 2,
      surgeries: [
        {
          surgeryId: surgeryId,
          durationMinutes: 120,
          surgeryCost: 25000,
          discountType: 'PERCENTAGE',
          discountValue: 0
        }
      ],
      items: [
        {
          chargeCategory: 'Anaesthesia',
          description: 'Local anesthesia base',
          quantity: 1,
          rate: 5000,
          discountType: 'FIXED_AMOUNT',
          discountValue: 0,
          itemGroup: 'ANAESTHESIA'
        }
      ]
    })
  });
  const estimateData = await estimateRes.json();
  console.log('Estimate Response:', estimateData);
  if (!estimateRes.ok) throw new Error('Estimate creation failed');
  const estimateId = estimateData.data.id;

  // 8. APPROVE ESTIMATE (requires Doctor role)
  console.log('\n[STEP 8] Logging in Doctor user...');
  const loginDoctorRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hospitalCode: 'CLKOX',
      username: doctorEmail,
      password: 'doctorpassword123'
    })
  });
  const loginDoctorData = await loginDoctorRes.json();
  if (!loginDoctorRes.ok) throw new Error('Doctor login failed');
  const doctorToken = loginDoctorData.data.accessToken || loginDoctorData.data.token;
  const doctorAuthHeaders = {
    ...authHeaders,
    'Authorization': `Bearer ${doctorToken}`
  };

  console.log('\nApproving Estimate...');
  const approveRes = await fetch(`${BASE_URL}/estimates/${estimateId}/status`, {
    method: 'PATCH',
    headers: doctorAuthHeaders,
    body: JSON.stringify({
      status: 'APPROVED'
    })
  });
  const approveData = await approveRes.json();
  console.log('Approve Estimate Response:', approveData);
  if (!approveRes.ok) throw new Error('Estimate approval failed');

  // 9. GENERATE PDF
  console.log('\n[STEP 9] Generating PDF for Estimate...');
  const pdfRes = await fetch(`${BASE_URL}/documents`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      documentType: 'ESTIMATE',
      targetId: estimateId,
      isPrintPreview: true
    })
  });
  const contentType = pdfRes.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    const pdfHtml = await pdfRes.text();
    console.log('PDF Generation Response (HTML preview):', pdfHtml.substring(0, 100) + '...');
  } else {
    const pdfData = await pdfRes.json();
    console.log('PDF Generation Response:', pdfData);
  }
  if (!pdfRes.ok) throw new Error('PDF generation failed');

  // 10. CREATE INVOICE
  console.log('\n[STEP 10] Creating Invoice...');
  // Retrieve the approved estimate items to get their IDs
  const getEstRes = await fetch(`${BASE_URL}/estimates/${estimateId}`, {
    headers: authHeaders
  });
  const getEstData = await getEstRes.json();
  const estSurgeries = getEstData.data.estimateSurgeries;
  const estItems = getEstData.data.estimateItems;

  const invoiceItems = [];
  if (estSurgeries && estSurgeries.length > 0) {
    invoiceItems.push({
      estimateSurgeryId: estSurgeries[0].id,
      quantity: 1,
      rate: Number(estSurgeries[0].finalAmount)
    });
  }
  if (estItems && estItems.length > 0) {
    invoiceItems.push({
      estimateItemId: estItems[0].id,
      quantity: 1,
      rate: Number(estItems[0].amount)
    });
  }

  const invoiceRes = await fetch(`${BASE_URL}/invoices`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      estimateId: estimateId,
      patientId: patientId,
      invoiceItems: invoiceItems
    })
  });
  const invoiceData = await invoiceRes.json();
  console.log('Invoice Response:', invoiceData);
  if (!invoiceRes.ok) throw new Error('Invoice creation failed');
  const invoiceId = invoiceData.data.id;

  // Finalize the invoice so we can allocate payments to it
  console.log('\nFinalizing Invoice...');
  const finalizeRes = await fetch(`${BASE_URL}/invoices/${invoiceId}/finalize`, {
    method: 'POST',
    headers: authHeaders
  });
  const finalizeData = await finalizeRes.json();
  console.log('Invoice Finalization Response:', finalizeData);
  if (!finalizeRes.ok) throw new Error('Invoice finalization failed');

  // 11. CREATE RECEIPT
  console.log('\n[STEP 11] Creating Receipt...');
  const receiptRes = await fetch(`${BASE_URL}/receipts`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      patientId: patientId,
      estimateId: estimateId,
      amount: 30000,
      paymentMode: 'CASH',
      remarks: 'Advance deposit'
    })
  });
  const receiptData = await receiptRes.json();
  console.log('Receipt Response:', receiptData);
  if (!receiptRes.ok) throw new Error('Receipt creation failed');
  const receiptId = receiptData.data.id;

  // 12. ALLOCATE PAYMENT
  console.log('\n[STEP 12] Allocating Payment...');
  const allocationRes = await fetch(`${BASE_URL}/payment-allocations`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      invoiceId: invoiceId,
      receiptId: receiptId,
      amountAllocated: 30000
    })
  });
  const allocationData = await allocationRes.json();
  console.log('Allocation Response:', allocationData);
  if (!allocationRes.ok) throw new Error('Payment allocation failed');

  console.log('\n--- E2E WORKFLOW SUCCESSFULLY COMPLETED! ---');
}

runWorkflow()
  .then(async () => {
    // Query the database rows
    console.log('\nFetching Database Summary from PostgreSQL:');
    const usersCount = await prisma.user.count();
    const patientRows = await prisma.patient.findMany({ select: { id: true, uhid: true, name: true } });
    const doctorRows = await prisma.doctor.findMany({ select: { id: true, firstName: true, lastName: true } });
    const calendarEventRows = await prisma.calendarEvent.findMany({ select: { id: true, title: true, eventStatus: true } });
    const estimateRows = await prisma.estimate.findMany({ select: { id: true, estimateNumber: true, status: true, grandTotal: true } });
    const documentRows = await prisma.documentGeneration.findMany({ select: { id: true, documentType: true, generatedFileName: true } });
    const invoiceRows = await prisma.invoice.findMany({ select: { id: true, invoiceNumber: true, status: true, grandTotal: true, paymentStatus: true } });
    const receiptRows = await prisma.receipt.findMany({ select: { id: true, receiptNumber: true, amount: true, status: true } });
    const allocationRows = await prisma.paymentAllocation.findMany();

    console.log(`Total Users in DB: ${usersCount}`);
    console.log('Patients in DB:', patientRows);
    console.log('Doctors in DB:', doctorRows);
    console.log('Calendar Events in DB:', calendarEventRows);
    console.log('Estimates in DB:', estimateRows);
    console.log('Generated Documents in DB:', documentRows);
    console.log('Invoices in DB:', invoiceRows);
    console.log('Receipts in DB:', receiptRows);
    console.log('Payment Allocations in DB:', allocationRows);

    process.exit(0);
  })
  .catch(async (err) => {
    console.error('\nWorkflow execution failed with error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
