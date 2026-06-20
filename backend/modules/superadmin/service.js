const bcrypt = require('bcryptjs');

class SuperAdminService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  /**
   * Clear all transactional / patient data for a hospital (for testing).
   * Keeps: Users, Hospital Profile, Surgeries, Rooms, OT Rooms,
   *        Hospital Charges, Billing Defaults, Estimate Templates.
   * Deletes: Patients, Events, Estimates, Invoices, Receipts, Refunds,
   *          Credit Notes, Advance Balances, Discount Codes, Audit Logs,
   *          Document Sequences, Pending Charges.
   */
  async clearTestData(hospitalId, currentUserId) {
    await this.prisma.$transaction(async (tx) => {
      // ── Discount Code sub-tables ───────────────────────────────────
      await tx.discountCodeAccessRequest.deleteMany({ where: { hospitalId } });
      await tx.discountCodeAuditLog.deleteMany({ where: { hospitalId } });
      await tx.adminDiscountCodeEditLog.deleteMany({
        where: { code: { hospitalId } }
      });
      await tx.discountCode.deleteMany({ where: { hospitalId } });

      // ── Audit & document sequences ──────────────────────────────────
      await tx.auditLog.deleteMany({ where: { hospitalId } });
      await tx.documentSequence.deleteMany({ where: { hospitalId } });
      await tx.documentGeneration.deleteMany({ where: { hospitalId } }).catch(() => {});

      // ── Billing: refunds → receipts → credit notes → invoices ───────
      await tx.refund.deleteMany({ where: { hospitalId } });
      await tx.receipt.deleteMany({ where: { hospitalId } });
      await tx.creditNote.deleteMany({ where: { hospitalId } });
      await tx.paymentAllocation.deleteMany({ where: { hospitalId } }).catch(() => {});
      await tx.invoice.deleteMany({ where: { hospitalId } });
      await tx.advanceBalance.deleteMany({ where: { hospitalId } });

      // ── Estimates (child rows cascade via Prisma relations) ──────────
      await tx.estimateItem.deleteMany({ where: { estimate: { hospitalId } } });
      await tx.estimateSurgery.deleteMany({ where: { estimate: { hospitalId } } });
      await tx.estimateVersion.deleteMany({ where: { estimate: { hospitalId } } }).catch(() => {});
      await tx.estimate.deleteMany({ where: { hospitalId } });

      // ── Pending master charges ───────────────────────────────────────
      await tx.pendingMasterCharge.deleteMany({ where: { hospitalId } });

      // ── Calendar events ──────────────────────────────────────────────
      await tx.calendarEvent.deleteMany({ where: { hospitalId } });

      // ── Patients ─────────────────────────────────────────────────────
      await tx.patient.deleteMany({ where: { hospitalId } });

      // ── Notifications ────────────────────────────────────────────────
      await tx.notification.deleteMany({ where: { hospitalId } }).catch(() => {});

      // ── Master / Configuration Data Deletions (Factory Reset additions) ────
      await tx.estimateTemplateItem.deleteMany({ where: { template: { hospitalId } } });
      await tx.estimateTemplate.deleteMany({ where: { hospitalId } });
      await tx.hospitalChargeMaster.deleteMany({ where: { hospitalId } });
      await tx.otRoomMaster.deleteMany({ where: { hospitalId } });
      await tx.roomMaster.deleteMany({ where: { hospitalId } });
      await tx.diagnosisProcedure.deleteMany({ where: { diagnosis: { hospitalId } } });
      await tx.diagnosisMaster.deleteMany({ where: { hospitalId } });
      await tx.surgeryMaster.deleteMany({ where: { hospitalId } });

      // ── Reset Billing Defaults to Zero ─────────────────────────────────────
      await tx.billingDefaults.updateMany({
        where: { hospitalId },
        data: {
          otCharges: 0,
          gaCharges: 0,
          laCharges: 0,
          sedationCharges: 0,
          assistantSurgeonCharges: 0,
          surgeonCharges: 0,
          roomCharges: 0,
          icuCharges: 0,
          wardCharges: 0,
          nursingCharges: 0,
          monitoringCharges: 0,
          dressingCharges: 0,
          consumableCharges: 0,
          equipmentCharges: 0,
          admissionCharges: 0,
          registrationCharges: 0
        }
      });

      // ── Password Reset Requests ────────────────────────────────────────────
      await tx.passwordResetRequest.deleteMany({ where: { user: { hospitalId } } });

      // ── Staff / Users Management Cleanup (preserving active admin) ─────────
      if (currentUserId) {
        // Delete all doctors except the logged in user
        await tx.doctor.deleteMany({
          where: {
            hospitalId,
            userId: { not: currentUserId }
          }
        });

        // Delete all users except the logged in user
        await tx.user.deleteMany({
          where: {
            hospitalId,
            id: { not: currentUserId }
          }
        });
      }
    }, { timeout: 60000 });

    return {
      message: 'System factory reset successfully. All transactional data, master records, configurations, templates, and staff logins have been cleared (except active admin credentials).'
    };
  }

  async listHospitals() {
    return this.prisma.hospitalProfile.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: {
            username: true,
            firstName: true,
            lastName: true,
            plainPassword: true,
            role: true
          }
        }
      }
    });
  }

  async toggleHospitalActiveStatus(id, isActive) {
    return this.prisma.hospitalProfile.update({
      where: { id },
      data: { isActive }
    });
  }

  async softDeleteHospital(id) {
    // Check active calendar events (pending or approved, and not deleted)
    const activeEvents = await this.prisma.calendarEvent.count({
      where: {
        hospitalId: id,
        eventStatus: { in: ['PENDING', 'APPROVED'] },
        deletedAt: null
      }
    });

    // Check active invoices (finalized and unpaid or partially paid)
    const activeInvoices = await this.prisma.invoice.count({
      where: {
        hospitalId: id,
        status: 'FINALIZED',
        paymentStatus: { in: ['UNPAID', 'PARTIALLY_PAID'] }
      }
    });

    if (activeEvents > 0 || activeInvoices > 0) {
      const err = new Error(
        `Cannot delete hospital. There are ${activeEvents} pending/approved calendar event(s) and ${activeInvoices} unpaid finalized invoice(s).`
      );
      err.status = 400;
      err.code = 'ERR_ACTIVE_DEPENDENCIES';
      throw err;
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete hospital profile
      await tx.hospitalProfile.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false
        }
      });

      // Deactivate associated users
      await tx.user.updateMany({
        where: { hospitalId: id },
        data: { isActive: false }
      });
    }, { timeout: 20000 });

    return { message: 'Hospital and associated users deactivated/deleted successfully.' };
  }

  async updateHospital(id, { name, address, phone, email, gstNumber }) {
    const hospital = await this.prisma.hospitalProfile.findUnique({ where: { id } });
    if (!hospital || hospital.deletedAt) {
      const err = new Error('Hospital not found.');
      err.status = 404;
      err.code = 'ERR_NOT_FOUND';
      throw err;
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (address !== undefined) updateData.address = address.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email.trim();
    if (gstNumber !== undefined) updateData.gstNumber = gstNumber?.trim() || null;

    const updated = await this.prisma.hospitalProfile.update({
      where: { id },
      data: updateData
    });

    return updated;
  }

  async createHospital({ code, name, address, gstNumber, phone, email, adminUsername, adminPassword, adminFirstName, adminLastName }) {
    // Check if username already exists globally
    const existingUser = await this.prisma.user.findUnique({
      where: { username: adminUsername }
    });
    if (existingUser) {
      const err = new Error('Admin username is already taken.');
      err.status = 409;
      err.code = 'ERR_USERNAME_TAKEN';
      throw err;
    }

    // Check if hospital code already exists
    const existingHospital = await this.prisma.hospitalProfile.findUnique({
      where: { code }
    });
    if (existingHospital) {
      const err = new Error('Hospital code is already in use.');
      err.status = 409;
      err.code = 'ERR_HOSPITAL_CODE_TAKEN';
      throw err;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const hospital = await tx.hospitalProfile.create({
        data: {
          code,
          name,
          address,
          gstNumber: gstNumber || null,
          phone,
          email,
          currency: 'INR',
          defaultGstRate: 18.00,
          estimatePrefix: 'EST',
          invoicePrefix: 'INV',
          receiptPrefix: 'REC',
          financialYearStart: '04-01'
        }
      });

      const user = await tx.user.create({
        data: {
          hospitalId: hospital.id,
          username: adminUsername,
          passwordHash,
          plainPassword: adminPassword,
          firstName: adminFirstName || null,
          lastName: adminLastName || null,
          role: 'ADMIN',
          mustChangePassword: false
        }
      });

      return { hospital, user };
    }, { timeout: 20000 });

    return {
      hospital: result.hospital,
      adminUser: {
        id: result.user.id,
        username: result.user.username,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role
      }
    };
  }

  async getPendingResets() {
    return this.prisma.passwordResetRequest.findMany({
      where: { status: 'PENDING' },
      orderBy: { requestedAt: 'desc' }
    });
  }

  async resolveReset(requestId, action, resolvedBy) {
    const request = await this.prisma.passwordResetRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      const err = new Error('Password reset request not found.');
      err.status = 404;
      err.code = 'ERR_REQUEST_NOT_FOUND';
      throw err;
    }

    if (request.status !== 'PENDING') {
      const err = new Error('Request has already been resolved.');
      err.status = 400;
      err.code = 'ERR_REQUEST_ALREADY_RESOLVED';
      throw err;
    }

    if (action === 'REJECT') {
      const updated = await this.prisma.passwordResetRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          resolvedAt: new Date(),
          resolvedBy
        }
      });
      return { status: updated.status };
    }

    if (action === 'APPROVE') {
      // Generate short temporary password
      const tempPassword = 'temp' + Math.floor(1000 + Math.random() * 9000);
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      await this.prisma.$transaction(async (tx) => {
        // Update user
        await tx.user.update({
          where: { id: request.userId },
          data: {
            passwordHash,
            plainPassword: tempPassword,
            mustChangePassword: false
          }
        });

        // Update request
        await tx.passwordResetRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            tempPassword,
            resolvedAt: new Date(),
            resolvedBy
          }
        });
      }, { timeout: 20000 });

      return {
        status: 'APPROVED',
        tempPassword
      };
    }

    const err = new Error('Invalid resolution action.');
    err.status = 400;
    err.code = 'ERR_INVALID_ACTION';
    throw err;
  }

  async backupDatabase() {
    // Export data from all tables
    const data = {
      hospitalProfiles: await this.prisma.hospitalProfile.findMany(),
      users: await this.prisma.user.findMany(),
      doctors: await this.prisma.doctor.findMany(),
      patients: await this.prisma.patient.findMany(),
      calendarEvents: await this.prisma.calendarEvent.findMany(),
      surgeryMasters: await this.prisma.surgeryMaster.findMany(),
      otRoomMasters: await this.prisma.otRoomMaster.findMany(),
      roomMasters: await this.prisma.roomMaster.findMany(),
      hospitalChargeMasters: await this.prisma.hospitalChargeMaster.findMany(),
      pendingMasterCharges: await this.prisma.pendingMasterCharge.findMany(),
      estimates: await this.prisma.estimate.findMany(),
      estimateTemplates: await this.prisma.estimateTemplate.findMany(),
      invoices: await this.prisma.invoice.findMany(),
      receipts: await this.prisma.receipt.findMany(),
      refunds: await this.prisma.refund.findMany(),
      advanceBalances: await this.prisma.advanceBalance.findMany(),
      creditNotes: await this.prisma.creditNote.findMany(),
      auditLogs: await this.prisma.auditLog.findMany(),
      documentSequences: await this.prisma.documentSequence.findMany(),
      passwordResetRequests: await this.prisma.passwordResetRequest.findMany()
    };

    return data;
  }

  async restoreDatabase(data, currentSuperAdminUserId) {
    if (!data) {
      throw new Error('No restore payload provided.');
    }

    await this.prisma.$transaction(async (tx) => {
      // 1. Delete in topological order (children first)
      await tx.passwordResetRequest.deleteMany();
      await tx.auditLog.deleteMany();
      await tx.documentSequence.deleteMany();
      await tx.refund.deleteMany();
      await tx.receipt.deleteMany();
      await tx.creditNote.deleteMany();
      await tx.invoice.deleteMany();
      await tx.advanceBalance.deleteMany();
      await tx.estimate.deleteMany();
      await tx.estimateTemplate.deleteMany();
      await tx.pendingMasterCharge.deleteMany();
      await tx.hospitalChargeMaster.deleteMany();
      await tx.otRoomMaster.deleteMany();
      await tx.roomMaster.deleteMany();
      await tx.surgeryMaster.deleteMany();
      await tx.calendarEvent.deleteMany();
      await tx.doctor.deleteMany();
      await tx.patient.deleteMany();
      
      // Delete all users except the active superadmin executing the restore
      await tx.user.deleteMany({
        where: { id: { not: currentSuperAdminUserId } }
      });
      await tx.hospitalProfile.deleteMany();

      // 2. Insert in reverse topological order (parents first)
      if (data.hospitalProfiles && data.hospitalProfiles.length > 0) {
        await tx.hospitalProfile.createMany({ data: data.hospitalProfiles });
      }

      if (data.users && data.users.length > 0) {
        // Exclude the active superadmin executing restore from insertion to prevent key clashes
        const usersToInsert = data.users.filter(u => u.id !== currentSuperAdminUserId);
        if (usersToInsert.length > 0) {
          await tx.user.createMany({ data: usersToInsert });
        }
      }

      if (data.doctors && data.doctors.length > 0) {
        await tx.doctor.createMany({ data: data.doctors });
      }

      if (data.patients && data.patients.length > 0) {
        await tx.patient.createMany({ data: data.patients });
      }

      if (data.calendarEvents && data.calendarEvents.length > 0) {
        await tx.calendarEvent.createMany({ data: data.calendarEvents });
      }

      if (data.surgeryMasters && data.surgeryMasters.length > 0) {
        await tx.surgeryMaster.createMany({ data: data.surgeryMasters });
      }

      if (data.roomMasters && data.roomMasters.length > 0) {
        await tx.roomMaster.createMany({ data: data.roomMasters });
      }

      if (data.otRoomMasters && data.otRoomMasters.length > 0) {
        await tx.otRoomMaster.createMany({ data: data.otRoomMasters });
      }

      if (data.hospitalChargeMasters && data.hospitalChargeMasters.length > 0) {
        await tx.hospitalChargeMaster.createMany({ data: data.hospitalChargeMasters });
      }

      if (data.pendingMasterCharges && data.pendingMasterCharges.length > 0) {
        await tx.pendingMasterCharge.createMany({ data: data.pendingMasterCharges });
      }

      if (data.estimateTemplates && data.estimateTemplates.length > 0) {
        await tx.estimateTemplate.createMany({ data: data.estimateTemplates });
      }

      if (data.estimates && data.estimates.length > 0) {
        await tx.estimate.createMany({ data: data.estimates });
      }

      if (data.invoices && data.invoices.length > 0) {
        await tx.invoice.createMany({ data: data.invoices });
      }

      if (data.advanceBalances && data.advanceBalances.length > 0) {
        await tx.advanceBalance.createMany({ data: data.advanceBalances });
      }

      if (data.creditNotes && data.creditNotes.length > 0) {
        await tx.creditNote.createMany({ data: data.creditNotes });
      }

      if (data.receipts && data.receipts.length > 0) {
        await tx.receipt.createMany({ data: data.receipts });
      }

      if (data.refunds && data.refunds.length > 0) {
        await tx.refund.createMany({ data: data.refunds });
      }

      if (data.documentSequences && data.documentSequences.length > 0) {
        await tx.documentSequence.createMany({ data: data.documentSequences });
      }

      if (data.auditLogs && data.auditLogs.length > 0) {
        await tx.auditLog.createMany({ data: data.auditLogs });
      }

      if (data.passwordResetRequests && data.passwordResetRequests.length > 0) {
        await tx.passwordResetRequest.createMany({ data: data.passwordResetRequests });
      }
    }, { timeout: 20000 });

    return { message: 'Database successfully restored.' };
  }
}

module.exports = SuperAdminService;
