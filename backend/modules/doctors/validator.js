/* 
  Purpose: Define validation rules for the Doctors Module.
  Responsibility: Validate incoming create and update bodies against Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const createDoctorSchema = z.object({
  userId: z.string().uuid('Invalid user ID format.').optional(),
  firstName: z.string().min(1, 'First name is required.').max(100),
  lastName: z.string().min(1, 'Last name is required.').max(100),
  specialty: z.string().min(1, 'Specialty is required.').max(100),
  licenseNumber: z.string().min(1, 'License number is required.').max(100),
  defaultSurgeonFee: z.number().nonnegative().optional()
});

const updateDoctorSchema = z.object({
  firstName: z.string().min(1, 'First name is required.').max(100),
  lastName: z.string().min(1, 'Last name is required.').max(100),
  specialty: z.string().min(1, 'Specialty is required.').max(100),
  licenseNumber: z.string().min(1, 'License number is required.').max(100),
  defaultSurgeonFee: z.number().nonnegative().optional()
});

class DoctorsValidator {
  constructor() {
    this.validateCreate = validateSchema(createDoctorSchema);
    this.validateUpdate = validateSchema(updateDoctorSchema);
  }
}

module.exports = DoctorsValidator;
