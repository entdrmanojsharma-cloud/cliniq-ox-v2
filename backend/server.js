/* 
  Purpose: Main entry point for the Cliniq-OX backend REST API service.
  Responsibility: Starts the Express server, registers middlewares, and mounts all core API routers.
*/
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { startKeepalive } = require('./utils/dbResilience');

// Configure Prisma with error logging so transient Neon errors are captured
const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// Log Prisma-level errors/warnings (these often include connection pool issues)
prisma.$on('error', (e) => {
  console.error('[Prisma Error]', e.message);
});
prisma.$on('warn', (e) => {
  console.warn('[Prisma Warn]', e.message);
});

async function initSuperAdmin() {
  try {
    const superAdmin = await prisma.user.findFirst({
      where: {
        role: 'SUPER_ADMIN'
      }
    });

    if (!superAdmin) {
      console.log('No SUPER_ADMIN found. Creating default Super Admin account (admin/admin)...');
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash('admin', 10);
      await prisma.user.create({
        data: {
          username: 'admin',
          passwordHash,
          firstName: 'Super',
          lastName: 'Admin',
          role: 'SUPER_ADMIN',
          mustChangePassword: false
        }
      });
      console.log('Default SUPER_ADMIN created successfully!');
    }
  } catch (err) {
    console.error('Failed to initialize default Super Admin:', err);
  }
}

initSuperAdmin();

// ── DB Resilience: Start Neon keepalive pinger ────────────────────────────────
// Pings the DB every 4 minutes to prevent Neon serverless cold starts
// (Neon suspends compute after ~5 minutes of inactivity)
startKeepalive(prisma);

const app = express();

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, PATCH, DELETE, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-hospital-id'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

const requestIdMiddleware = require('./middleware/requestId');
app.use(requestIdMiddleware);

// --- Auth Module ---
const AuthRepository = require('./modules/auth/repository');
const AuthService = require('./modules/auth/service');
const AuthValidator = require('./modules/auth/validator');
const AuthController = require('./modules/auth/controller');
const createAuthRouter = require('./modules/auth/routes');

const authRepo = new AuthRepository(prisma);
const authService = new AuthService(authRepo);
const authValidator = new AuthValidator();
const authController = new AuthController(authService);
const authRouter = createAuthRouter(authController, authValidator);

// --- Hospital Profile Module ---
const HospitalProfileRepository = require('./modules/hospital-profile/repository');
const HospitalProfileService = require('./modules/hospital-profile/service');
const HospitalProfileValidator = require('./modules/hospital-profile/validator');
const HospitalProfileController = require('./modules/hospital-profile/controller');
const createHospitalProfileRouter = require('./modules/hospital-profile/routes');

const hospitalProfileRepo = new HospitalProfileRepository(prisma);
const hospitalProfileService = new HospitalProfileService(hospitalProfileRepo, prisma);
const hospitalProfileValidator = new HospitalProfileValidator();
const hospitalProfileController = new HospitalProfileController(hospitalProfileService);
const hospitalProfileRouter = createHospitalProfileRouter(hospitalProfileController, hospitalProfileValidator);

// --- Patients Module ---
const PatientsRepository = require('./modules/patients/repository');
const PatientsService = require('./modules/patients/service');
const PatientsValidator = require('./modules/patients/validator');
const PatientsController = require('./modules/patients/controller');
const createPatientsRouter = require('./modules/patients/routes');

const patientsRepo = new PatientsRepository(prisma);
const patientsService = new PatientsService(patientsRepo, hospitalProfileRepo, prisma);
const patientsValidator = new PatientsValidator();
const patientsController = new PatientsController(patientsService);
const patientsRouter = createPatientsRouter(patientsController, patientsValidator);

// --- Doctors Module ---
const DoctorsRepository = require('./modules/doctors/repository');
const DoctorsService = require('./modules/doctors/service');
const DoctorsValidator = require('./modules/doctors/validator');
const DoctorsController = require('./modules/doctors/controller');
const createDoctorsRouter = require('./modules/doctors/routes');

const doctorsRepo = new DoctorsRepository(prisma);
const doctorsService = new DoctorsService(doctorsRepo, authRepo, prisma);
const doctorsValidator = new DoctorsValidator();
const doctorsController = new DoctorsController(doctorsService);
const doctorsRouter = createDoctorsRouter(doctorsController, doctorsValidator);

// --- Calendar Module ---
const CalendarRepository = require('./modules/calendar/repository');
const CalendarService = require('./modules/calendar/service');
const CalendarValidator = require('./modules/calendar/validator');
const CalendarController = require('./modules/calendar/controller');
const createCalendarRouter = require('./modules/calendar/routes');

const calendarRepo = new CalendarRepository(prisma);
const calendarService = new CalendarService(calendarRepo, prisma);
const calendarValidator = new CalendarValidator();
const calendarController = new CalendarController(calendarService);
const calendarRouter = createCalendarRouter(calendarController, calendarValidator);

// --- Surgeries Module ---
const SurgeriesRepository = require('./modules/surgeries/repository');
const SurgeriesService = require('./modules/surgeries/service');
const SurgeriesValidator = require('./modules/surgeries/validator');
const SurgeriesController = require('./modules/surgeries/controller');
const createSurgeriesRouter = require('./modules/surgeries/routes');

const surgeriesRepo = new SurgeriesRepository(prisma);
const surgeriesService = new SurgeriesService(surgeriesRepo, prisma);
const surgeriesValidator = new SurgeriesValidator();
const surgeriesController = new SurgeriesController(surgeriesService);
const surgeriesRouter = createSurgeriesRouter(surgeriesController, surgeriesValidator);

// --- Rooms Module ---
const RoomsRepository = require('./modules/rooms/repository');
const RoomsService = require('./modules/rooms/service');
const RoomsValidator = require('./modules/rooms/validator');
const RoomsController = require('./modules/rooms/controller');
const createRoomsRouter = require('./modules/rooms/routes');

const roomsRepo = new RoomsRepository(prisma);
const roomsService = new RoomsService(roomsRepo, prisma);
const roomsValidator = new RoomsValidator();
const roomsController = new RoomsController(roomsService);
const roomsRouter = createRoomsRouter(roomsController, roomsValidator);

// --- OT Rooms Module ---
const OtRoomsRepository = require('./modules/ot-rooms/repository');
const OtRoomsService = require('./modules/ot-rooms/service');
const OtRoomsValidator = require('./modules/ot-rooms/validator');
const OtRoomsController = require('./modules/ot-rooms/controller');
const createOtRoomsRouter = require('./modules/ot-rooms/routes');

const otRoomsRepo = new OtRoomsRepository(prisma);
const otRoomsService = new OtRoomsService(otRoomsRepo, prisma);
const otRoomsValidator = new OtRoomsValidator();
const otRoomsController = new OtRoomsController(otRoomsService);
const otRoomsRouter = createOtRoomsRouter(otRoomsController, otRoomsValidator);

// --- Hospital Charges Module ---
const HospitalChargesRepository = require('./modules/hospital-charges/repository');
const HospitalChargesService = require('./modules/hospital-charges/service');
const HospitalChargesValidator = require('./modules/hospital-charges/validator');
const HospitalChargesController = require('./modules/hospital-charges/controller');
const createHospitalChargesRouter = require('./modules/hospital-charges/routes');

const hospitalChargesRepo = new HospitalChargesRepository(prisma);
const hospitalChargesService = new HospitalChargesService(hospitalChargesRepo, prisma);
const hospitalChargesValidator = new HospitalChargesValidator();
const hospitalChargesController = new HospitalChargesController(hospitalChargesService);
const hospitalChargesRouter = createHospitalChargesRouter(hospitalChargesController, hospitalChargesValidator);

// --- Pending Charges Approval Module ---
const PendingChargesRepository = require('./modules/pending-master-charges/repository');
const PendingChargesService = require('./modules/pending-master-charges/service');
const PendingChargesValidator = require('./modules/pending-master-charges/validator');
const PendingChargesController = require('./modules/pending-master-charges/controller');
const createPendingChargesRouter = require('./modules/pending-master-charges/routes');

const pendingChargesRepo = new PendingChargesRepository(prisma);
const pendingChargesService = new PendingChargesService(pendingChargesRepo, prisma);
const pendingChargesValidator = new PendingChargesValidator();
const pendingChargesController = new PendingChargesController(pendingChargesService);
const pendingChargesRouter = createPendingChargesRouter(pendingChargesController, pendingChargesValidator);

// --- Estimates Module ---
const EstimatesRepository = require('./modules/estimates/repository');
const EstimatesService = require('./modules/estimates/service');
const EstimatesValidator = require('./modules/estimates/validator');
const EstimatesController = require('./modules/estimates/controller');
const createEstimatesRouter = require('./modules/estimates/routes');

const estimatesRepo = new EstimatesRepository(prisma);
const estimatesService = new EstimatesService(estimatesRepo, prisma);
const estimatesValidator = new EstimatesValidator();
const estimatesController = new EstimatesController(estimatesService);
const estimatesRouter = createEstimatesRouter(estimatesController, estimatesValidator);

// --- Discount Codes Module ---
const DiscountCodesService = require('./modules/discount-codes/service');
const DiscountCodesValidator = require('./modules/discount-codes/validator');
const DiscountCodesController = require('./modules/discount-codes/controller');
const createDiscountCodesRouter = require('./modules/discount-codes/routes');

const discountCodesService = new DiscountCodesService(prisma);
const discountCodesValidator = new DiscountCodesValidator();
const discountCodesController = new DiscountCodesController(discountCodesService);
const discountCodesRouter = createDiscountCodesRouter(discountCodesController, discountCodesValidator);

// --- Estimate Templates Module ---
const EstimateTemplatesRepository = require('./modules/estimate-templates/repository');
const EstimateTemplatesService = require('./modules/estimate-templates/service');
const EstimateTemplatesValidator = require('./modules/estimate-templates/validator');
const EstimateTemplatesController = require('./modules/estimate-templates/controller');
const createEstimateTemplatesRouter = require('./modules/estimate-templates/routes');

const estimateTemplatesRepo = new EstimateTemplatesRepository(prisma);
const estimateTemplatesService = new EstimateTemplatesService(estimateTemplatesRepo, prisma);
const estimateTemplatesValidator = new EstimateTemplatesValidator();
const estimateTemplatesController = new EstimateTemplatesController(estimateTemplatesService);
const estimateTemplatesRouter = createEstimateTemplatesRouter(estimateTemplatesController, estimateTemplatesValidator);

// --- Diagnosis Master Module ---
const DiagnosisMasterRepository = require('./modules/diagnosis-master/repository');
const DiagnosisMasterService = require('./modules/diagnosis-master/service');
const DiagnosisMasterValidator = require('./modules/diagnosis-master/validator');
const DiagnosisMasterController = require('./modules/diagnosis-master/controller');
const createDiagnosisMasterRouter = require('./modules/diagnosis-master/routes');

const diagnosisMasterRepo = new DiagnosisMasterRepository(prisma);
const diagnosisMasterService = new DiagnosisMasterService(diagnosisMasterRepo, prisma);
const diagnosisMasterValidator = new DiagnosisMasterValidator();
const diagnosisMasterController = new DiagnosisMasterController(diagnosisMasterService);
const diagnosisMasterRouter = createDiagnosisMasterRouter(diagnosisMasterController, diagnosisMasterValidator);


// --- Billing Defaults Module ---
const BillingDefaultsRepository = require('./modules/billing-defaults/repository');
const BillingDefaultsService = require('./modules/billing-defaults/service');
const BillingDefaultsValidator = require('./modules/billing-defaults/validator');
const BillingDefaultsController = require('./modules/billing-defaults/controller');
const createBillingDefaultsRouter = require('./modules/billing-defaults/routes');

const billingDefaultsRepo = new BillingDefaultsRepository(prisma);
const billingDefaultsService = new BillingDefaultsService(billingDefaultsRepo, prisma);
const billingDefaultsValidator = new BillingDefaultsValidator();
const billingDefaultsController = new BillingDefaultsController(billingDefaultsService);
const billingDefaultsRouter = createBillingDefaultsRouter(billingDefaultsController, billingDefaultsValidator);


// --- Documents Generation Module ---
const DocumentsRepository = require('./modules/documents/repository');
const DocumentsService = require('./modules/documents/service');
const DocumentsValidator = require('./modules/documents/validator');
const DocumentsController = require('./modules/documents/controller');
const createDocumentsRouter = require('./modules/documents/routes');

const documentsRepo = new DocumentsRepository(prisma);
const documentsService = new DocumentsService(documentsRepo, prisma);
const documentsValidator = new DocumentsValidator();
const documentsController = new DocumentsController(documentsService);
const documentsRouter = createDocumentsRouter(documentsController, documentsValidator);

// --- Notifications Module ---
const NotificationsRepository = require('./modules/notifications/repository');
const NotificationsService = require('./modules/notifications/service');
const NotificationsValidator = require('./modules/notifications/validator');
const NotificationsController = require('./modules/notifications/controller');
const createNotificationsRouter = require('./modules/notifications/routes');

const notificationsRepo = new NotificationsRepository(prisma);
const notificationsService = new NotificationsService(notificationsRepo);
const notificationsValidator = new NotificationsValidator();
const notificationsController = new NotificationsController(notificationsService);
const notificationsRouter = createNotificationsRouter(notificationsController, notificationsValidator);

// --- Reports Module ---
const ReportsRepository = require('./modules/reports/repository');
const ReportsService = require('./modules/reports/service');
const ReportsValidator = require('./modules/reports/validator');
const ReportsController = require('./modules/reports/controller');
const createReportsRouter = require('./modules/reports/routes');

const reportsRepo = new ReportsRepository(prisma);
const reportsService = new ReportsService(reportsRepo, prisma);
const reportsValidator = new ReportsValidator();
const reportsController = new ReportsController(reportsService);
const reportsRouter = createReportsRouter(reportsController, reportsValidator);

// --- Invoices & Billing Modules ---
const InvoicesRepository = require('./modules/invoices/repository');
const InvoicesService = require('./modules/invoices/service');
const InvoicesValidator = require('./modules/invoices/validator');
const InvoicesController = require('./modules/invoices/controller');
const createInvoicesRouter = require('./modules/invoices/routes');

const invoicesRepo = new InvoicesRepository(prisma);
const invoicesService = new InvoicesService(invoicesRepo, prisma);
const invoicesValidator = new InvoicesValidator();
const invoicesController = new InvoicesController(invoicesService);
const invoicesRouter = createInvoicesRouter(invoicesController, invoicesValidator);

const ReceiptsRepository = require('./modules/receipts/repository');
const ReceiptsService = require('./modules/receipts/service');
const ReceiptsValidator = require('./modules/receipts/validator');
const ReceiptsController = require('./modules/receipts/controller');
const createReceiptsRouter = require('./modules/receipts/routes');

const AdvanceBalancesRepository = require('./modules/advance-balances/repository');
const advanceBalancesRepo = new AdvanceBalancesRepository(prisma);

const receiptsRepo = new ReceiptsRepository(prisma);
const receiptsService = new ReceiptsService(receiptsRepo, advanceBalancesRepo, prisma);
const receiptsValidator = new ReceiptsValidator();
const receiptsController = new ReceiptsController(receiptsService);
const receiptsRouter = createReceiptsRouter(receiptsController, receiptsValidator);

const RefundsRepository = require('./modules/refunds/repository');
const RefundsService = require('./modules/refunds/service');
const RefundsValidator = require('./modules/refunds/validator');
const RefundsController = require('./modules/refunds/controller');
const createRefundsRouter = require('./modules/refunds/routes');

const refundsRepo = new RefundsRepository(prisma);
const refundsService = new RefundsService(refundsRepo, advanceBalancesRepo, prisma);
const refundsValidator = new RefundsValidator();
const refundsController = new RefundsController(refundsService);
const refundsRouter = createRefundsRouter(refundsController, refundsValidator);

const PaymentAllocationsRepository = require('./modules/payment-allocations/repository');
const PaymentAllocationsService = require('./modules/payment-allocations/service');
const PaymentAllocationsValidator = require('./modules/payment-allocations/validator');
const PaymentAllocationsController = require('./modules/payment-allocations/controller');
const createPaymentAllocationsRouter = require('./modules/payment-allocations/routes');

const paymentAllocationsRepo = new PaymentAllocationsRepository(prisma);
const paymentAllocationsService = new PaymentAllocationsService(paymentAllocationsRepo, invoicesRepo, advanceBalancesRepo, prisma);
const paymentAllocationsValidator = new PaymentAllocationsValidator();
const paymentAllocationsController = new PaymentAllocationsController(paymentAllocationsService);
const paymentAllocationsRouter = createPaymentAllocationsRouter(paymentAllocationsController, paymentAllocationsValidator);

const AdvanceBalancesService = require('./modules/advance-balances/service');
const AdvanceBalancesValidator = require('./modules/advance-balances/validator');
const AdvanceBalancesController = require('./modules/advance-balances/controller');
const createAdvanceBalancesRouter = require('./modules/advance-balances/routes');

const advanceBalancesService = new AdvanceBalancesService(advanceBalancesRepo);
const advanceBalancesValidator = new AdvanceBalancesValidator();
const advanceBalancesController = new AdvanceBalancesController(advanceBalancesService);
const advanceBalancesRouter = createAdvanceBalancesRouter(advanceBalancesController, advanceBalancesValidator);

const CreditNotesRepository = require('./modules/credit-notes/repository');
const CreditNotesService = require('./modules/credit-notes/service');
const CreditNotesValidator = require('./modules/credit-notes/validator');
const CreditNotesController = require('./modules/credit-notes/controller');
const createCreditNotesRouter = require('./modules/credit-notes/routes');

const creditNotesRepo = new CreditNotesRepository(prisma);
const creditNotesService = new CreditNotesService(creditNotesRepo, invoicesRepo, advanceBalancesRepo, prisma);
const creditNotesValidator = new CreditNotesValidator();
const creditNotesController = new CreditNotesController(creditNotesService);
const creditNotesRouter = createCreditNotesRouter(creditNotesController, creditNotesValidator);

const SuperAdminService = require('./modules/superadmin/service');
const SuperAdminController = require('./modules/superadmin/controller');
const createSuperAdminRouter = require('./modules/superadmin/routes');

const superAdminService = new SuperAdminService(prisma);
const superAdminController = new SuperAdminController(superAdminService);
const superAdminRouter = createSuperAdminRouter(superAdminController);

// --- Dashboard Stats Module ---
const DashboardService = require('./modules/dashboard/service');
const DashboardController = require('./modules/dashboard/controller');
const createDashboardRouter = require('./modules/dashboard/routes');

const dashboardService = new DashboardService(prisma);
const dashboardController = new DashboardController(dashboardService);
const dashboardRouter = createDashboardRouter(dashboardController);

// --- Data Management Module ---
const DataManagementRepository = require('./modules/data-management/repository');
const DataManagementService = require('./modules/data-management/service');
const DataManagementController = require('./modules/data-management/controller');
const createDataManagementRouter = require('./modules/data-management/routes');

const dataManagementRepo = new DataManagementRepository(prisma);
const dataManagementService = new DataManagementService(dataManagementRepo, prisma);
const dataManagementController = new DataManagementController(dataManagementService);
const dataManagementRouter = createDataManagementRouter(dataManagementController);

// --- Health Check (for Render.com monitoring) ---
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// --- Mount Routes ---
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/data-management', dataManagementRouter);
app.use('/api/v1/superadmin', superAdminRouter);
app.use('/api/v1/hospital-profile', hospitalProfileRouter);
app.use('/api/v1/patients', patientsRouter);
app.use('/api/v1/doctors', doctorsRouter);
app.use('/api/v1/calendar', calendarRouter);
app.use('/api/v1/surgeries', surgeriesRouter);
app.use('/api/v1/rooms', roomsRouter);
app.use('/api/v1/ot-rooms', otRoomsRouter);
app.use('/api/v1/hospital-charges', hospitalChargesRouter);
app.use('/api/v1/pending-master-charges', pendingChargesRouter);
app.use('/api/v1/estimates', estimatesRouter);
app.use('/api/v1/diagnosis-master', diagnosisMasterRouter);
app.use('/api/v1/discount-codes', discountCodesRouter);
app.use('/api/v1/estimate-templates', estimateTemplatesRouter);
app.use('/api/v1/billing-defaults', billingDefaultsRouter);
app.use('/api/v1/documents', documentsRouter);
app.use('/api/v1/invoices', invoicesRouter);
app.use('/api/v1/receipts', receiptsRouter);
app.use('/api/v1/refunds', refundsRouter);
app.use('/api/v1/payment-allocations', paymentAllocationsRouter);
app.use('/api/v1/advance-balances', advanceBalancesRouter);
app.use('/api/v1/credit-notes', creditNotesRouter);
app.use('/api/v1/dashboard', dashboardRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/reports', reportsRouter);

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Cliniq-OX Backend API</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: radial-gradient(circle at top, #1e1b4b 0%, #0f172a 100%);
            color: #f8fafc;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
          }
          .card {
            background: rgba(30, 41, 59, 0.45);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 40px;
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
            text-align: center;
            max-width: 550px;
            width: 100%;
          }
          .icon {
            font-size: 64px;
            margin-bottom: 20px;
            background: linear-gradient(135deg, #a78bfa 0%, #818cf8 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            display: inline-block;
          }
          h1 {
            font-size: 32px;
            font-weight: 800;
            margin: 0 0 10px 0;
            background: linear-gradient(to right, #ffffff, #cbd5e1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .badge {
            background: rgba(16, 185, 129, 0.15);
            color: #34d399;
            padding: 6px 16px;
            border-radius: 50px;
            font-size: 13px;
            font-weight: 600;
            display: inline-block;
            margin-bottom: 24px;
            border: 1px solid rgba(52, 211, 153, 0.2);
          }
          p {
            color: #94a3b8;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 32px 0;
          }
          .btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
            color: #ffffff;
            text-decoration: none;
            padding: 14px 28px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 15px;
            box-shadow: 0 10px 20px -5px rgba(79, 70, 229, 0.4);
            transition: all 0.2s ease;
            border: none;
            cursor: pointer;
          }
          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px -5px rgba(79, 70, 229, 0.6);
            background: linear-gradient(135deg, #4338ca 0%, #4f46e5 100%);
          }
          .btn:active {
            transform: translateY(0);
          }
          .footer {
            margin-top: 32px;
            font-size: 12px;
            color: #475569;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✦</div>
          <h1>Cliniq-OX Server</h1>
          <div class="badge">● API Services Active</div>
          <p>The backend REST API is listening successfully. For client interactions, dashboard metrics, patient records, and estimate planning, launch the frontend application.</p>
          <a href="http://localhost:9010" class="btn">Launch Web Frontend</a>
          <div class="footer">
            Cliniq-OX Management System • Version 0.1.3-alpha
          </div>
        </div>
      </body>
    </html>
  `);
});

const errorHandlerMiddleware = require('./middleware/errorHandler');
app.use(errorHandlerMiddleware);

module.exports = app;
