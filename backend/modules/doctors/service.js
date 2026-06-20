/* 
  Purpose: Business service orchestration layer for the Doctors Module.
  Responsibility: Enforce credentials checks, prevent duplicate profiling, execute soft-deletes, and write audits.
*/

const writeAuditLog = require('../../shared/audit');

class DoctorsService {
  constructor(repository, userRepository, prisma) {
    this.repository = repository;
    this.userRepository = userRepository;
    this.prisma = prisma;
  }

  async getDoctors(hospitalId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const { doctors, total } = await this.repository.findAndCount({
      hospitalId,
      skip,
      take: limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      specialty: query.specialty
    });

    return {
      doctors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async getDoctorById(id, hospitalId) {
    const doctor = await this.repository.findById(id, hospitalId);
    if (!doctor) {
      const err = new Error('Doctor profile not found.');
      err.status = 404;
      err.code = 'ERR_DOCTOR_NOT_FOUND';
      throw err;
    }
    return doctor;
  }

  async createDoctor(hospitalId, data, userContext) {
    let userId = data.userId;

    if (!userId) {
      // Create user login on the fly
      const bcrypt = require('bcryptjs');
      const defaultPasswordHash = await bcrypt.hash('password123', 10);
      const email = `doc_${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}_${Date.now()}@cliniqox.com`;

      const newUser = await this.prisma.user.create({
        data: {
          hospitalId,
          email,
          passwordHash: defaultPasswordHash,
          role: 'DOCTOR'
        }
      });
      userId = newUser.id;
    } else {
      // Assert target user exists and is a Doctor role
      const targetUser = await this.prisma.user.findFirst({
        where: { id: userId, hospitalId }
      });

      if (!targetUser) {
        const err = new Error('Associated user login not found under this hospital tenant.');
        err.status = 404;
        err.code = 'ERR_USER_NOT_FOUND';
        throw err;
      }

      if (targetUser.role !== 'DOCTOR') {
        const err = new Error('Target user does not have a DOCTOR role.');
        err.status = 400;
        err.code = 'ERR_INVALID_ROLE';
        throw err;
      }
    }

    const existingProfile = await this.repository.findByUserId(userId, hospitalId);
    if (existingProfile) {
      const err = new Error('A doctor profile already exists for this user.');
      err.status = 409;
      err.code = 'ERR_USER_ALREADY_PROFILED';
      throw err;
    }

    const newDoctor = await this.repository.create({
      hospitalId,
      userId,
      firstName: data.firstName,
      lastName: data.lastName,
      specialty: data.specialty,
      licenseNumber: data.licenseNumber,
      defaultSurgeonFee: data.defaultSurgeonFee || 0.00
    });

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'CREATE_DOCTOR',
      targetTable: 'doctors',
      targetId: newDoctor.id,
      payload: newDoctor
    });

    return newDoctor;
  }

  async updateDoctor(id, hospitalId, data, userContext) {
    const existing = await this.getDoctorById(id, hospitalId);

    // If non-admin requests update, verify it is their own profile
    if (userContext.role !== 'ADMIN' && existing.userId !== userContext.userId) {
      const err = new Error('Unauthorized profile modification request.');
      err.status = 403;
      err.code = 'ERR_FORBIDDEN';
      throw err;
    }

    await this.repository.update(id, hospitalId, {
      firstName: data.firstName,
      lastName: data.lastName,
      specialty: data.specialty,
      licenseNumber: data.licenseNumber,
      defaultSurgeonFee: data.defaultSurgeonFee
    });

    const updated = await this.getDoctorById(id, hospitalId);

    await writeAuditLog(this.prisma, {
      hospitalId,
      userId: userContext.userId,
      userName: userContext.email,
      role: userContext.role,
      action: 'UPDATE_DOCTOR',
      targetTable: 'doctors',
      targetId: id,
      payload: { previous: existing, updated }
    });

    return updated;
  }

  async softDeleteDoctor(id, hospitalId, userContext) {
    await this.getDoctorById(id, hospitalId);

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
      action: 'SOFT_DELETE_DOCTOR',
      targetTable: 'doctors',
      targetId: id,
      payload: { id, status: 'DEACTIVATED' }
    });

    return { id, success: true };
  }
}

module.exports = DoctorsService;
