/* 
  Purpose: Business service orchestration layer for the Hospital Profile Module.
  Responsibility: Enforce tenant validations, update profile data, and trigger audit logging.
*/

const writeAuditLog = require('../../shared/audit');

class HospitalProfileService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async getProfile(hospitalId) {
    const profile = await this.repository.findById(hospitalId);
    if (!profile) {
      const err = new Error('Hospital profile not found.');
      err.status = 404;
      err.code = 'ERR_HOSPITAL_NOT_FOUND';
      throw err;
    }
    return profile;
  }

  async updateProfile(hospitalId, data, userContext) {
    const existing = await this.getProfile(hospitalId);
    const updated = await this.repository.update(hospitalId, data);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email, // Injected via controller from req.user
      role: userContext.role,
      action: 'UPDATE_HOSPITAL_PROFILE',
      targetTable: 'hospital_profile',
      targetId: hospitalId,
      payload: { previous: existing, updated }
    });

    return updated;
  }
}

module.exports = HospitalProfileService;
