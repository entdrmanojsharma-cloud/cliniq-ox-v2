/* 
  Purpose: Business service orchestration layer for the Patients Module.
  Responsibility: Enforce tenancy checks, auto-generate sequential patient UHIDs, handle soft-deletes, and write audits.
*/

const writeAuditLog = require('../../shared/audit');

class PatientsService {
  constructor(repository, hospitalRepository, prisma) {
    this.repository = repository;
    this.hospitalRepository = hospitalRepository;
    this.prisma = prisma;
  }

  async getPatients(hospitalId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const { patients, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      mobile: query.mobile,
      search: query.search,
      pmjay: query.pmjay
    });

    return {
      patients,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getPatientById(id, hospitalId) {
    const patient = await this.repository.findById(id, hospitalId);
    if (!patient) {
      const err = new Error('Patient profile not found.');
      err.status = 404;
      err.code = 'ERR_PATIENT_NOT_FOUND';
      throw err;
    }
    return patient;
  }

  async createPatient(hospitalId, data, userContext) {
    const hospital = await this.hospitalRepository.findById(hospitalId);
    if (!hospital) {
      const err = new Error('Hospital tenant profile not found.');
      err.status = 404;
      err.code = 'ERR_HOSPITAL_NOT_FOUND';
      throw err;
    }

    const currentYear = new Date().getFullYear();
    const latestPatient = await this.repository.getLatestUHID(hospitalId, currentYear.toString());
    
    let serial = 1;
    if (latestPatient && latestPatient.uhid) {
      const parts = latestPatient.uhid.split('-');
      const lastSerial = parseInt(parts[parts.length - 1]);
      if (!isNaN(lastSerial)) {
        serial = lastSerial + 1;
      }
    }

    const paddedSerial = serial.toString().padStart(6, '0');
    const generatedUHID = `${hospital.code}-${currentYear}-${paddedSerial}`;

    const newPatient = await this.repository.create({
      hospitalId,
      uhid: generatedUHID,
      name: data.name,
      dateOfBirth: new Date(data.dateOfBirth),
      gender: data.gender,
      mobile: data.mobile,
      address: data.address,
      referringDoctor: data.referringDoctor,
      notes: data.notes,
      pmjayNumber: data.pmjayNumber,
      consultingDoctorId: data.consultingDoctorId || null
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CREATE_PATIENT',
      targetTable: 'patients',
      targetId: newPatient.id,
      payload: newPatient
    });

    return newPatient;
  }

  async updatePatient(id, hospitalId, data, userContext) {
    const existing = await this.getPatientById(id, hospitalId);
    
    await this.repository.update(id, hospitalId, {
      name: data.name,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
      gender: data.gender,
      mobile: data.mobile,
      address: data.address,
      referringDoctor: data.referringDoctor,
      notes: data.notes,
      pmjayNumber: data.pmjayNumber,
      consultingDoctorId: data.consultingDoctorId !== undefined ? (data.consultingDoctorId || null) : undefined
    });

    const updated = await this.getPatientById(id, hospitalId);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'UPDATE_PATIENT',
      targetTable: 'patients',
      targetId: id,
      payload: { previous: existing, updated }
    });

    return updated;
  }

  async softDeletePatient(id, hospitalId, userContext) {
    const existing = await this.getPatientById(id, hospitalId);

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
      action: 'SOFT_DELETE_PATIENT',
      targetTable: 'patients',
      targetId: id,
      payload: { id, status: 'DEACTIVATED' }
    });

    return { id, success: true };
  }
}

module.exports = PatientsService;
