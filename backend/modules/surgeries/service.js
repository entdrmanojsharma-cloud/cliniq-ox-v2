/* 
  Purpose: Business service orchestration layer for the Surgery Master Module.
  Responsibility: Enforce code uniqueness checks, audit logs, and soft deletes.
*/

const writeAuditLog = require('../../shared/audit');

class SurgeriesService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async getSurgeries(hospitalId, query) {
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const { surgeries, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      category: query.category
    });

    return {
      surgeries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getSurgeryById(id, hospitalId) {
    const surgery = await this.repository.findById(id, hospitalId);
    if (!surgery) {
      const err = new Error('Surgery record not found.');
      err.status = 404;
      err.code = 'ERR_SURGERY_NOT_FOUND';
      throw err;
    }
    return surgery;
  }

  async createSurgery(hospitalId, data, userContext) {
    const existing = await this.repository.findByCode(data.surgeryCode, hospitalId);
    if (existing) {
      const err = new Error('A surgery with this code already exists under your hospital profile.');
      err.status = 409;
      err.code = 'ERR_SURGERY_CODE_EXISTS';
      throw err;
    }

    const newSurgery = await this.repository.create({
      hospitalId,
      surgeryCode: data.surgeryCode,
      surgeryName: data.surgeryName,
      category: data.category,
      defaultSurgeonFee: data.defaultSurgeonFee || 0.00
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CREATE_SURGERY',
      targetTable: 'surgery_master',
      targetId: newSurgery.id,
      payload: newSurgery
    });

    return newSurgery;
  }

  async updateSurgery(id, hospitalId, data, userContext) {
    const existing = await this.getSurgeryById(id, hospitalId);

    if (data.surgeryCode && data.surgeryCode !== existing.surgeryCode) {
      const codeCheck = await this.repository.findByCode(data.surgeryCode, hospitalId);
      if (codeCheck) {
        const err = new Error('Surgery code already in use.');
        err.status = 409;
        err.code = 'ERR_SURGERY_CODE_EXISTS';
        throw err;
      }
    }

    await this.repository.update(id, hospitalId, {
      surgeryCode: data.surgeryCode,
      surgeryName: data.surgeryName,
      category: data.category,
      defaultSurgeonFee: data.defaultSurgeonFee
    });

    const updated = await this.getSurgeryById(id, hospitalId);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'UPDATE_SURGERY',
      targetTable: 'surgery_master',
      targetId: id,
      payload: { previous: existing, updated }
    });

    return updated;
  }

  async softDeleteSurgery(id, hospitalId, userContext) {
    await this.getSurgeryById(id, hospitalId);

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
      action: 'SOFT_DELETE_SURGERY',
      targetTable: 'surgery_master',
      targetId: id,
      payload: { id, status: 'DEACTIVATED' }
    });

    return { id, success: true };
  }
}

module.exports = SurgeriesService;
