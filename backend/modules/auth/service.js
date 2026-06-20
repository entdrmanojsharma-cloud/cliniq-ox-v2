/* 
  Purpose: Business service orchestration layer for the Authentication Module.
  Responsibility: Enforce password hashing, credentials validation, and JWT signing logic.
*/

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-signing-key';

class AuthService {
  constructor(authRepository) {
    this.authRepository = authRepository;
  }

  async verifyUsername(username) {
    if (!username) {
      const err = new Error('Username is required.');
      err.status = 400;
      throw err;
    }
    const user = await this.authRepository.findUserByUsername(username.trim());
    if (!user) {
      return false;
    }
    if (user.role !== 'SUPER_ADMIN') {
      if (!user.hospital || !user.hospital.isActive || user.hospital.deletedAt !== null) {
        return false;
      }
    }
    if (!user.isActive) {
      return false;
    }
    return true;
  }

  async signup({ 
    hospitalCode, username, password, role, firstName, lastName,
    staffType, qualification, specialty, department, licenseNumber,
    experience, mobileNumber, email, digitalSignature 
  }) {
    const hospital = await this.authRepository.findHospitalByCode(hospitalCode);
    if (!hospital) {
      const err = new Error('Hospital code not found.');
      err.status = 404;
      err.code = 'ERR_HOSPITAL_NOT_FOUND';
      throw err;
    }

    const existingUser = await this.authRepository.findUserByUsername(username);
    if (existingUser) {
      const err = new Error('Username / User ID is already taken.');
      err.status = 409;
      err.code = 'ERR_USERNAME_TAKEN';
      throw err;
    }

    // Determine Role based on staffType
    let computedRole = role;
    if (staffType) {
      if (['Doctor', 'Anesthetist', 'Surgeon', 'Visiting Consultant'].includes(staffType)) {
        computedRole = 'DOCTOR';
      } else if (staffType === 'Admin') {
        computedRole = 'ADMIN';
      } else if (staffType === 'Receptionist') {
        computedRole = 'RECEPTIONIST';
      } else {
        computedRole = 'RECEPTIONIST'; // Default role for Nurses, Technicians, etc.
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.authRepository.createUser({
      hospitalId: hospital.id,
      username,
      passwordHash,
      plainPassword: password,
      role: computedRole,
      staffType: staffType || null,
      firstName: firstName || null,
      lastName: lastName || null
    });

    if (computedRole === 'DOCTOR') {
      await this.authRepository.prisma.doctor.create({
        data: {
          hospitalId: hospital.id,
          userId: user.id,
          firstName: firstName || 'Doctor',
          lastName: lastName || 'User',
          specialty: specialty || 'General',
          licenseNumber: licenseNumber || `LIC-${Date.now()}`,
          defaultSurgeonFee: 0.00,
          isActive: true,
          qualification: qualification || null,
          department: department || null,
          experience: experience || null,
          mobileNumber: mobileNumber || null,
          email: email || null,
          digitalSignature: digitalSignature || null
        }
      });
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      staffType: user.staffType,
      firstName: user.firstName,
      lastName: user.lastName
    };
  }
  async login({ username, password }) {
    const user = await this.authRepository.findUserByUsername(username);
    if (!user) {
      const err = new Error('Invalid username, password, or inactive user session.');
      err.status = 401;
      err.code = 'ERR_INVALID_CREDENTIALS';
      throw err;
    }

    if (user.role !== 'SUPER_ADMIN') {
      if (!user.hospital || !user.hospital.isActive || user.hospital.deletedAt !== null) {
        const err = new Error('Your hospital tenant is inactive or has been deleted. Please contact your administrator.');
        err.status = 401;
        err.code = 'ERR_HOSPITAL_INACTIVE';
        throw err;
      }
    }

    if (!user.isActive) {
      const err = new Error('Invalid username, password, or inactive user session.');
      err.status = 401;
      err.code = 'ERR_INVALID_CREDENTIALS';
      throw err;
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      const err = new Error('Invalid username, password, or inactive user session.');
      err.status = 401;
      err.code = 'ERR_INVALID_CREDENTIALS';
      throw err;
    }

    const capabilities = [];
    if (user.role === 'DOCTOR') {
      capabilities.push('SURGERY_MASTER_MANAGER');
    }

    const accessToken = jwt.sign(
      { userId: user.id, role: user.role, hospitalId: user.hospitalId || null, capabilities },
      JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d' }
    );
    const refreshToken = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    return {
      accessToken,
      refreshToken,
      role: user.role,
      hospitalId: user.hospitalId || null,
      mustChangePassword: user.mustChangePassword,
      firstName: user.firstName || null,
      lastName: user.lastName || null
    };
  }

  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      const err = new Error('Refresh token is required.');
      err.status = 400;
      err.code = 'ERR_BAD_REQUEST';
      throw err;
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_SECRET);
      const user = await this.authRepository.prisma.user.findUnique({
        where: { id: decoded.userId },
        include: { hospital: true }
      });

      if (!user || !user.isActive) {
        const err = new Error('User not found or inactive.');
        err.status = 401;
        err.code = 'ERR_UNAUTHORIZED';
        throw err;
      }

      if (user.role !== 'SUPER_ADMIN') {
        if (!user.hospital || !user.hospital.isActive || user.hospital.deletedAt !== null) {
          const err = new Error('Your hospital tenant is inactive or has been deleted.');
          err.status = 401;
          err.code = 'ERR_HOSPITAL_INACTIVE';
          throw err;
        }
      }

      const capabilities = [];
      if (user.role === 'DOCTOR') {
        capabilities.push('SURGERY_MASTER_MANAGER');
      }

      const accessToken = jwt.sign(
        { userId: user.id, role: user.role, hospitalId: user.hospitalId || null, capabilities },
        JWT_SECRET,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '7d' }
      );

      return { accessToken };
    } catch (err) {
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        const authErr = new Error('Refresh token has expired or is invalid.');
        authErr.status = 401;
        authErr.code = 'ERR_INVALID_TOKEN';
        throw authErr;
      }
      throw err;
    }
  }

  async requestForgotPassword(username) {
    const user = await this.authRepository.findUserByUsername(username);
    if (!user) {
      const err = new Error('Username not found.');
      err.status = 404;
      err.code = 'ERR_USER_NOT_FOUND';
      throw err;
    }

    const request = await this.authRepository.prisma.passwordResetRequest.create({
      data: {
        userId: user.id,
        username: user.username,
        status: 'PENDING'
      }
    });

    return {
      message: 'Password reset request submitted successfully. Please contact your Super Admin for approval.',
      requestId: request.id
    };
  }

  async changePassword(userId, newPassword) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.authRepository.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        plainPassword: newPassword,
        mustChangePassword: false
      }
    });

    return { message: 'Password changed successfully!' };
  }

  async listStaff(hospitalId) {
    const users = await this.authRepository.prisma.user.findMany({
      where: { hospitalId, role: { not: 'SUPER_ADMIN' } },
      select: { 
        id: true, 
        username: true, 
        firstName: true, 
        lastName: true, 
        role: true, 
        staffType: true,
        isActive: true, 
        createdAt: true,
        doctorProfile: {
          select: {
            id: true,
            specialty: true,
            licenseNumber: true,
            qualification: true,
            department: true,
            experience: true,
            mobileNumber: true,
            email: true,
            digitalSignature: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return users;
  }

  async updateStaff(hospitalId, userId, { 
    role, isActive, newPassword, firstName, lastName,
    staffType, qualification, specialty, department, licenseNumber,
    experience, mobileNumber, email, digitalSignature 
  }) {
    // Ensure staff belongs to this hospital
    const user = await this.authRepository.prisma.user.findFirst({
      where: { id: userId, hospitalId }
    });
    if (!user) {
      const err = new Error('Staff user not found in this hospital.');
      err.status = 404; err.code = 'ERR_NOT_FOUND'; throw err;
    }

    // Determine Role based on staffType
    let computedRole = role;
    if (staffType !== undefined) {
      if (['Doctor', 'Anesthetist', 'Surgeon', 'Visiting Consultant'].includes(staffType)) {
        computedRole = 'DOCTOR';
      } else if (staffType === 'Admin') {
        computedRole = 'ADMIN';
      } else {
        computedRole = 'RECEPTIONIST';
      }
    }

    const updateData = {};
    if (computedRole !== undefined) updateData.role = computedRole;
    if (staffType !== undefined) updateData.staffType = staffType;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (firstName !== undefined) updateData.firstName = firstName || null;
    if (lastName !== undefined) updateData.lastName = lastName || null;
    if (newPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
      updateData.plainPassword = newPassword;
      updateData.mustChangePassword = false;
    }

    const updated = await this.authRepository.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, username: true, firstName: true, lastName: true, role: true, staffType: true, isActive: true }
    });

    // Sync to Doctor profile if role is DOCTOR
    const doctorProfile = await this.authRepository.prisma.doctor.findUnique({
      where: { userId }
    });

    if (updated.role === 'DOCTOR') {
      if (!doctorProfile) {
        await this.authRepository.prisma.doctor.create({
          data: {
            hospitalId,
            userId,
            firstName: updated.firstName || 'Doctor',
            lastName: updated.lastName || 'User',
            specialty: specialty || 'General',
            licenseNumber: licenseNumber || `LIC-${Date.now()}`,
            defaultSurgeonFee: 0.00,
            isActive: updated.isActive,
            qualification: qualification || null,
            department: department || null,
            experience: experience || null,
            mobileNumber: mobileNumber || null,
            email: email || null,
            digitalSignature: digitalSignature || null
          }
        });
      } else {
        await this.authRepository.prisma.doctor.update({
          where: { userId },
          data: {
            isActive: updated.isActive,
            firstName: firstName !== undefined ? (firstName || 'Doctor') : doctorProfile.firstName,
            lastName: lastName !== undefined ? (lastName || 'User') : doctorProfile.lastName,
            specialty: specialty !== undefined ? specialty : doctorProfile.specialty,
            licenseNumber: licenseNumber !== undefined ? licenseNumber : doctorProfile.licenseNumber,
            qualification: qualification !== undefined ? qualification : doctorProfile.qualification,
            department: department !== undefined ? department : doctorProfile.department,
            experience: experience !== undefined ? experience : doctorProfile.experience,
            mobileNumber: mobileNumber !== undefined ? mobileNumber : doctorProfile.mobileNumber,
            email: email !== undefined ? email : doctorProfile.email,
            digitalSignature: digitalSignature !== undefined ? digitalSignature : doctorProfile.digitalSignature
          }
        });
      }
    } else if (doctorProfile) {
      // Role changed from DOCTOR to something else, deactivate doctor profile
      await this.authRepository.prisma.doctor.update({
        where: { userId },
        data: { isActive: false }
      });
    }

    return updated;
  }

  async deleteStaff(hospitalId, userId) {
    const user = await this.authRepository.prisma.user.findFirst({
      where: { id: userId, hospitalId }
    });
    if (!user) {
      const err = new Error('Staff user not found in this hospital.');
      err.status = 404; err.code = 'ERR_NOT_FOUND'; throw err;
    }
    if (user.role === 'ADMIN') {
      const err = new Error('Cannot delete the primary Admin account.');
      err.status = 400; err.code = 'ERR_CANNOT_DELETE_ADMIN'; throw err;
    }
    await this.authRepository.prisma.user.delete({ where: { id: userId } });
    return { message: 'Staff user deleted successfully.' };
  }
}

module.exports = AuthService;
