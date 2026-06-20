/* 
  Purpose: Business service orchestration layer for the Pending Master Charges Module.
  Responsibility: Enforce state-change validation rules, orchestrate promotes, and write audit trails.
*/

const writeAuditLog = require('../../shared/audit');

class PendingMasterChargesService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async getPendingCharges(hospitalId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { charges, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      status: query.status
    });

    return {
      charges,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getPendingChargeById(id, hospitalId) {
    const charge = await this.repository.findById(id, hospitalId);
    if (!charge) {
      const err = new Error('Pending charge request not found.');
      err.status = 404;
      err.code = 'ERR_PENDING_CHARGE_NOT_FOUND';
      throw err;
    }
    return charge;
  }

  async createPendingCharge(hospitalId, data, userContext) {
    const newPending = await this.repository.create({
      hospitalId,
      status: 'PENDING',
      chargeName: data.chargeName,
      chargeCategory: data.chargeCategory,
      defaultRate: data.defaultRate || 0.00,
      defaultGst: data.defaultGst || 0.00,
      unitType: data.unitType,
      createdBy: userContext.userId
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'PROPOSE_PENDING_CHARGE',
      targetTable: 'pending_master_charges',
      targetId: newPending.id,
      payload: newPending
    });

    return newPending;
  }

  async approvePendingCharge(id, hospitalId, userContext) {
    const pending = await this.getPendingChargeById(id, hospitalId);
    if (pending.status !== 'PENDING') {
      const err = new Error(`Request has already been processed: status is ${pending.status}.`);
      err.status = 400;
      err.code = 'ERR_INVALID_PENDING_STATUS';
      throw err;
    }

    // Check if there is already a charge with the same name in the active master
    const duplicate = await this.prisma.hospitalChargeMaster.findFirst({
      where: { chargeName: pending.chargeName, hospitalId, isActive: true }
    });
    if (duplicate) {
      const err = new Error('An active charge with this name already exists.');
      err.status = 409;
      err.code = 'ERR_CHARGE_EXISTS';
      throw err;
    }

    const promoted = await this.repository.approveAndPromote(
      id,
      hospitalId,
      { status: 'APPROVED' },
      {
        hospitalId,
        chargeName: pending.chargeName,
        chargeCategory: pending.chargeCategory,
        defaultRate: pending.defaultRate,
        defaultGst: pending.defaultGst,
        unitType: pending.unitType
      }
    );

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'APPROVE_PENDING_CHARGE',
      targetTable: 'pending_master_charges',
      targetId: id,
      payload: { id, status: 'APPROVED', promotedChargeId: promoted.id }
    });

    return promoted;
  }

  async rejectPendingCharge(id, hospitalId, userContext) {
    const pending = await this.getPendingChargeById(id, hospitalId);
    if (pending.status !== 'PENDING') {
      const err = new Error(`Request has already been processed: status is ${pending.status}.`);
      err.status = 400;
      err.code = 'ERR_INVALID_PENDING_STATUS';
      throw err;
    }

    await this.repository.update(id, hospitalId, { status: 'REJECTED' });
    const updated = await this.getPendingChargeById(id, hospitalId);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'REJECT_PENDING_CHARGE',
      targetTable: 'pending_master_charges',
      targetId: id,
      payload: { id, status: 'REJECTED' }
    });

    return updated;
  }

  async softDeletePendingCharge(id, hospitalId, userContext) {
    await this.getPendingChargeById(id, hospitalId);

    await this.repository.update(id, hospitalId, {
      isActive: false,
      deletedAt: new Date(),
      deletedBy: userContext.userId
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'SOFT_DELETE_PENDING_CHARGE',
      targetTable: 'pending_master_charges',
      targetId: id,
      payload: { id, status: 'DEACTIVATED' }
    });

    return { id, success: true };
  }
}

module.exports = PendingMasterChargesService;
