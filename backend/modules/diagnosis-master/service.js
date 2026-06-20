const writeAuditLog = require('../../shared/audit');

class DiagnosisMasterService {
  constructor(repository, prisma) {
    this.repository = repository;
    this.prisma = prisma;
  }

  async createDiagnosis(hospitalId, data, userContext) {
    const existing = await this.repository.findByCode(hospitalId, data.diagnosisCode);
    if (existing) {
      const err = new Error(`Diagnosis code "${data.diagnosisCode}" already exists.`);
      err.status = 409;
      err.code = 'ERR_CONFLICT';
      throw err;
    }

    const { procedures, ...diagnosisData } = data;
    
    const result = await this.repository.create({
      ...diagnosisData,
      hospitalId
    });

    if (procedures && procedures.length > 0) {
      await this.repository.setProcedures(result.id, procedures);
    }

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.username,
      role: userContext.role,
      action: 'CREATE_DIAGNOSIS',
      targetTable: 'diagnosis_master',
      targetId: result.id,
      payload: { code: data.diagnosisCode, name: data.diagnosisName }
    });

    return this.repository.findById(result.id, hospitalId);
  }

  async updateDiagnosis(id, hospitalId, data, userContext) {
    const existing = await this.repository.findById(id, hospitalId);
    if (!existing) {
      const err = new Error('Diagnosis not found.');
      err.status = 404;
      err.code = 'ERR_NOT_FOUND';
      throw err;
    }

    if (data.diagnosisCode && data.diagnosisCode !== existing.diagnosisCode) {
      const codeCheck = await this.repository.findByCode(hospitalId, data.diagnosisCode);
      if (codeCheck) {
        const err = new Error(`Diagnosis code "${data.diagnosisCode}" already exists.`);
        err.status = 409;
        err.code = 'ERR_CONFLICT';
        throw err;
      }
    }

    const { procedures, ...diagnosisData } = data;

    if (Object.keys(diagnosisData).length > 0) {
      await this.repository.update(id, hospitalId, diagnosisData);
    }

    if (procedures !== undefined) {
      await this.repository.setProcedures(id, procedures);
    }

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.username,
      role: userContext.role,
      action: 'UPDATE_DIAGNOSIS',
      targetTable: 'diagnosis_master',
      targetId: id,
      payload: { updates: Object.keys(data) }
    });

    return this.repository.findById(id, hospitalId);
  }

  async listDiagnoses(hospitalId) {
    return this.repository.list(hospitalId);
  }

  async getDiagnosis(id, hospitalId) {
    const record = await this.repository.findById(id, hospitalId);
    if (!record) {
      const err = new Error('Diagnosis not found.');
      err.status = 404;
      err.code = 'ERR_NOT_FOUND';
      throw err;
    }
    return record;
  }

  async deleteDiagnosis(id, hospitalId, userContext) {
    const existing = await this.repository.findById(id, hospitalId);
    if (!existing) {
      const err = new Error('Diagnosis not found.');
      err.status = 404;
      err.code = 'ERR_NOT_FOUND';
      throw err;
    }

    await this.repository.delete(id, hospitalId, userContext.userId);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.username,
      role: userContext.role,
      action: 'DELETE_DIAGNOSIS',
      targetTable: 'diagnosis_master',
      targetId: id,
      payload: { name: existing.diagnosisName }
    });

    return { success: true };
  }
}

module.exports = DiagnosisMasterService;
