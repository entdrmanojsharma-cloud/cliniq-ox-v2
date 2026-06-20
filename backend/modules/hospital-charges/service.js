/* 
  Purpose: Business service orchestration layer for the Hospital Charges Master Module.
  Responsibility: Validate charge names are unique, audit master changes, and soft deactivate logs.
*/

const writeAuditLog = require('../../shared/audit');

class HospitalChargesService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async getCharges(hospitalId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { charges, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
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

  async getChargeById(id, hospitalId) {
    const charge = await this.repository.findById(id, hospitalId);
    if (!charge) {
      const err = new Error('Hospital charge record not found.');
      err.status = 404;
      err.code = 'ERR_CHARGE_NOT_FOUND';
      throw err;
    }
    return charge;
  }

  async createCharge(hospitalId, data, userContext) {
    const existing = await this.repository.findByName(data.chargeName, hospitalId);
    if (existing) {
      const err = new Error('A charge with this name already exists.');
      err.status = 409;
      err.code = 'ERR_CHARGE_EXISTS';
      throw err;
    }

    const newCharge = await this.repository.create({
      hospitalId,
      chargeName: data.chargeName,
      chargeCategory: data.chargeCategory,
      defaultRate: data.defaultRate || 0.00,
      defaultGst: data.defaultGst || 0.00,
      unitType: data.unitType
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CREATE_HOSPITAL_CHARGE',
      targetTable: 'hospital_charges_master',
      targetId: newCharge.id,
      payload: newCharge
    });

    return newCharge;
  }

  async updateCharge(id, hospitalId, data, userContext) {
    const existing = await this.getChargeById(id, hospitalId);

    if (data.chargeName && data.chargeName !== existing.chargeName) {
      const nameCheck = await this.repository.findByName(data.chargeName, hospitalId);
      if (nameCheck) {
        const err = new Error('A charge with this name already exists.');
        err.status = 409;
        err.code = 'ERR_CHARGE_EXISTS';
        throw err;
      }
    }

    await this.repository.update(id, hospitalId, {
      chargeName: data.chargeName,
      chargeCategory: data.chargeCategory,
      defaultRate: data.defaultRate,
      defaultGst: data.defaultGst,
      unitType: data.unitType
    });

    const updated = await this.getChargeById(id, hospitalId);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'UPDATE_HOSPITAL_CHARGE',
      targetTable: 'hospital_charges_master',
      targetId: id,
      payload: { previous: existing, updated }
    });

    return updated;
  }

  async softDeleteCharge(id, hospitalId, userContext) {
    await this.getChargeById(id, hospitalId);

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
      action: 'SOFT_DELETE_HOSPITAL_CHARGE',
      targetTable: 'hospital_charges_master',
      targetId: id,
      payload: { id, status: 'DEACTIVATED' }
    });

    return { id, success: true };
  }
}

module.exports = HospitalChargesService;
