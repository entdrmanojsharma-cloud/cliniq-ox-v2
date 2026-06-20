const writeAuditLog = require('../../shared/audit');

class DiscountCodesService {
  constructor(prisma) {
    this.prisma = prisma;
  }

  // Retrieve Doctor Profile if user is DOCTOR
  async _getDoctorId(userId) {
    const doc = await this.prisma.doctor.findUnique({
      where: { userId }
    });
    if (!doc) {
      const err = new Error('Doctor profile not found for the user.');
      err.status = 404;
      err.code = 'ERR_DOCTOR_NOT_FOUND';
      throw err;
    }
    return doc.id;
  }

  async listCodes(hospitalId, userContext) {
    const { role, userId } = userContext;

    if (role === 'ADMIN') {
      return this.prisma.discountCode.findMany({
        where: { hospitalId },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (role === 'DOCTOR') {
      const doctorId = await this._getDoctorId(userId);
      return this.prisma.discountCode.findMany({
        where: { hospitalId, doctorId },
        orderBy: { createdAt: 'desc' }
      });
    }

    // Receptionists cannot browse/list codes directly
    const err = new Error('Unauthorized to view discount code directory.');
    err.status = 403;
    err.code = 'ERR_UNAUTHORIZED';
    throw err;
  }

  async createCode(hospitalId, data, userContext) {
    const { role, userId } = userContext;
    const { code, description, discountType, value, validFrom, validTo, usageLimit } = data;

    // Check code collision
    const existing = await this.prisma.discountCode.findUnique({
      where: {
        hospitalId_code: { hospitalId, code }
      }
    });
    if (existing) {
      const err = new Error(`Discount code "${code}" already exists in this hospital.`);
      err.status = 400;
      err.code = 'ERR_CODE_ALREADY_EXISTS';
      throw err;
    }

    const createData = {
      hospitalId,
      code,
      description,
      discountType,
      value,
      validFrom,
      validTo,
      usageLimit,
      createdByRole: role,
      createdByUserId: userId,
      status: 'ACTIVE'
    };

    if (role === 'DOCTOR') {
      createData.doctorId = await this._getDoctorId(userId);
    } else if (role !== 'ADMIN') {
      const err = new Error('Unauthorized role to create discount codes.');
      err.status = 403;
      err.code = 'ERR_UNAUTHORIZED';
      throw err;
    }

    const codeRecord = await this.prisma.discountCode.create({
      data: createData
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId,
      action: 'CREATE_DISCOUNT_CODE',
      targetTable: 'discount_codes',
      targetId: codeRecord.id,
      payload: { code }
    });

    return codeRecord;
  }

  async updateCode(id, hospitalId, data, userContext) {
    const { role, userId } = userContext;
    const { description, discountType, value, validFrom, validTo, usageLimit, reason } = data;

    const existing = await this.prisma.discountCode.findFirst({
      where: { id, hospitalId }
    });
    if (!existing) {
      const err = new Error('Discount code not found.');
      err.status = 404;
      err.code = 'ERR_CODE_NOT_FOUND';
      throw err;
    }

    // Role-based auth checks
    if (role === 'DOCTOR') {
      const doctorId = await this._getDoctorId(userId);
      if (existing.doctorId !== doctorId) {
        const err = new Error('Unauthorized to modify another doctor\'s code.');
        err.status = 403;
        err.code = 'ERR_UNAUTHORIZED';
        throw err;
      }
    } else if (role !== 'ADMIN') {
      const err = new Error('Unauthorized role to update discount codes.');
      err.status = 403;
      err.code = 'ERR_UNAUTHORIZED';
      throw err;
    }

    // Mandatory admin check and logs
    const isOverride = role === 'ADMIN' && existing.createdByRole === 'DOCTOR';
    if (role === 'ADMIN' && !reason) {
      const err = new Error('Override or updates by Admin require a mandatory reason.');
      err.status = 400;
      err.code = 'ERR_REASON_REQUIRED';
      throw err;
    }

    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (discountType !== undefined) updateData.discountType = discountType;
    if (value !== undefined) updateData.value = value;
    if (validFrom !== undefined) updateData.validFrom = validFrom;
    if (validTo !== undefined) updateData.validTo = validTo;
    if (usageLimit !== undefined) updateData.usageLimit = usageLimit;

    const updated = await this.prisma.discountCode.update({
      where: { id },
      data: updateData
    });

    // Write audit log
    await writeAuditLog(this.prisma, {
      hospitalId,
      userId,
      action: 'UPDATE_DISCOUNT_CODE',
      targetTable: 'discount_codes',
      targetId: id,
      payload: { code: existing.code, isOverride }
    });

    // Admin override log
    if (role === 'ADMIN') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const adminName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Admin';

      await this.prisma.adminDiscountCodeEditLog.create({
        data: {
          hospitalId,
          codeId: id,
          codeName: existing.code,
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(updated),
          editedByUserId: userId,
          editedByName: adminName,
          reason: reason || 'Admin updated code config.'
        }
      });
    }

    return updated;
  }

  async toggleStatus(id, hospitalId, status, userContext) {
    const { role, userId } = userContext;

    if (status !== 'ACTIVE' && status !== 'DISABLED') {
      const err = new Error('Invalid status value. Must be ACTIVE or DISABLED.');
      err.status = 400;
      err.code = 'ERR_INVALID_STATUS';
      throw err;
    }

    const existing = await this.prisma.discountCode.findFirst({
      where: { id, hospitalId }
    });
    if (!existing) {
      const err = new Error('Discount code not found.');
      err.status = 404;
      err.code = 'ERR_CODE_NOT_FOUND';
      throw err;
    }

    if (role === 'DOCTOR') {
      const doctorId = await this._getDoctorId(userId);
      if (existing.doctorId !== doctorId) {
        const err = new Error('Unauthorized to modify another doctor\'s code.');
        err.status = 403;
        err.code = 'ERR_UNAUTHORIZED';
        throw err;
      }
    } else if (role !== 'ADMIN') {
      const err = new Error('Unauthorized role to toggle code status.');
      err.status = 403;
      err.code = 'ERR_UNAUTHORIZED';
      throw err;
    }

    const updated = await this.prisma.discountCode.update({
      where: { id },
      data: { status }
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId,
      action: status === 'ACTIVE' ? 'ENABLE_DISCOUNT_CODE' : 'DISABLE_DISCOUNT_CODE',
      targetTable: 'discount_codes',
      targetId: id,
      payload: { code: existing.code }
    });

    // Admin override log
    if (role === 'ADMIN') {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const adminName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Admin';

      await this.prisma.adminDiscountCodeEditLog.create({
        data: {
          hospitalId,
          codeId: id,
          codeName: existing.code,
          oldValue: JSON.stringify(existing),
          newValue: JSON.stringify(updated),
          editedByUserId: userId,
          editedByName: adminName,
          reason: `Admin toggled status to ${status}.`
        }
      });
    }

    return updated;
  }

  async deleteCode(id, hospitalId, userContext) {
    const { role, userId } = userContext;

    const existing = await this.prisma.discountCode.findFirst({
      where: { id, hospitalId }
    });
    if (!existing) {
      const err = new Error('Discount code not found.');
      err.status = 404;
      err.code = 'ERR_CODE_NOT_FOUND';
      throw err;
    }

    if (role === 'DOCTOR') {
      const doctorId = await this._getDoctorId(userId);
      if (existing.doctorId !== doctorId) {
        const err = new Error('Unauthorized to delete another doctor\'s code.');
        err.status = 403;
        err.code = 'ERR_UNAUTHORIZED';
        throw err;
      }
    } else if (role !== 'ADMIN') {
      const err = new Error('Unauthorized role to delete discount codes.');
      err.status = 403;
      err.code = 'ERR_UNAUTHORIZED';
      throw err;
    }

    await this.prisma.discountCode.delete({
      where: { id }
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId,
      action: 'DELETE_DISCOUNT_CODE',
      targetTable: 'discount_codes',
      targetId: id,
      payload: { code: existing.code }
    });

    return { id, deleted: true };
  }

  async validateCode(hospitalId, codeString) {
    const normalized = (codeString || '').toUpperCase().trim();
    if (!normalized) {
      const err = new Error('Code string cannot be empty.');
      err.status = 400;
      err.code = 'ERR_EMPTY_CODE';
      throw err;
    }

    const code = await this.prisma.discountCode.findUnique({
      where: {
        hospitalId_code: { hospitalId, code: normalized }
      }
    });

    if (!code) {
      const err = new Error('Discount code not found.');
      err.status = 404;
      err.code = 'ERR_CODE_NOT_FOUND';
      throw err;
    }

    if (code.status !== 'ACTIVE') {
      const err = new Error('Discount code is disabled.');
      err.status = 400;
      err.code = 'ERR_CODE_DISABLED';
      throw err;
    }

    const now = new Date();
    if (now < code.validFrom) {
      const err = new Error('Discount code is not active yet.');
      err.status = 400;
      err.code = 'ERR_CODE_NOT_ACTIVE_YET';
      throw err;
    }

    if (now > code.validTo) {
      const err = new Error('Discount code has expired.');
      err.status = 400;
      err.code = 'ERR_CODE_EXPIRED';
      throw err;
    }

    if (code.usageCount >= code.usageLimit) {
      const err = new Error('Discount code usage limit exceeded.');
      err.status = 400;
      err.code = 'ERR_USAGE_LIMIT_EXCEEDED';
      throw err;
    }

    return {
      id: code.id,
      code: code.code,
      discountType: code.discountType,
      value: Number(code.value)
    };
  }

  // --- Code Discovery / Requests Approval Layer ---

  async createAccessRequest(hospitalId, userContext) {
    const { userId } = userContext;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Staff';

    // check if PENDING request already exists
    const active = await this.prisma.discountCodeAccessRequest.findFirst({
      where: { hospitalId, requestedByUserId: userId, status: 'PENDING' }
    });
    if (active) {
      return active;
    }

    return this.prisma.discountCodeAccessRequest.create({
      data: {
        hospitalId,
        requestedByUserId: userId,
        requestedByName: name,
        status: 'PENDING'
      }
    });
  }

  async getActiveAccessRequest(hospitalId, userContext) {
    const { userId } = userContext;
    // Get latest request
    return this.prisma.discountCodeAccessRequest.findFirst({
      where: { hospitalId, requestedByUserId: userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async listAccessRequests(hospitalId, userContext) {
    const { role } = userContext;
    if (role !== 'ADMIN' && role !== 'DOCTOR') {
      const err = new Error('Unauthorized.');
      err.status = 403;
      throw err;
    }

    return this.prisma.discountCodeAccessRequest.findMany({
      where: { hospitalId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async approveAccessRequest(id, hospitalId, userContext) {
    const { role, userId } = userContext;
    if (role !== 'ADMIN' && role !== 'DOCTOR') {
      const err = new Error('Unauthorized.');
      err.status = 403;
      throw err;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Staff';

    return this.prisma.discountCodeAccessRequest.update({
      where: { id, hospitalId },
      data: {
        status: 'APPROVED',
        approvedByUserId: userId,
        approvedByName: name
      }
    });
  }

  async rejectAccessRequest(id, hospitalId, userContext) {
    const { role, userId } = userContext;
    if (role !== 'ADMIN' && role !== 'DOCTOR') {
      const err = new Error('Unauthorized.');
      err.status = 403;
      throw err;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const name = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username : 'Staff';

    return this.prisma.discountCodeAccessRequest.update({
      where: { id, hospitalId },
      data: {
        status: 'REJECTED',
        approvedByUserId: userId,
        approvedByName: name
      }
    });
  }

  async getRevealedCodes(hospitalId, userContext) {
    const { role, userId } = userContext;

    if (role === 'DOCTOR' || role === 'ADMIN') {
      return this.prisma.discountCode.findMany({
        where: { hospitalId, status: 'ACTIVE' },
        orderBy: { code: 'asc' }
      });
    }

    if (role === 'RECEPTIONIST') {
      const access = await this.prisma.discountCodeAccessRequest.findFirst({
        where: {
          hospitalId,
          requestedByUserId: userId,
          status: 'APPROVED',
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // last 24 hours
          }
        }
      });

      if (!access) {
        const err = new Error('Discovery forbidden. Please request doctor/admin approval to reveal discount codes.');
        err.status = 403;
        err.code = 'ERR_ACCESS_DENIED';
        throw err;
      }

      return this.prisma.discountCode.findMany({
        where: { hospitalId, status: 'ACTIVE' },
        orderBy: { code: 'asc' }
      });
    }

    const err = new Error('Role unauthorized.');
    err.status = 403;
    throw err;
  }

  // --- Audit Logs View Layer (Admins only) ---

  async getAuditLogs(hospitalId, userContext) {
    const { role } = userContext;
    if (role !== 'ADMIN') {
      const err = new Error('Unauthorized to view discount code audits.');
      err.status = 403;
      err.code = 'ERR_UNAUTHORIZED';
      throw err;
    }

    const applicationLogs = await this.prisma.discountCodeAuditLog.findMany({
      where: { hospitalId },
      orderBy: { appliedAt: 'desc' }
    });

    const editLogs = await this.prisma.adminDiscountCodeEditLog.findMany({
      where: { hospitalId },
      orderBy: { editedAt: 'desc' }
    });

    return { applicationLogs, editLogs };
  }
}

module.exports = DiscountCodesService;
