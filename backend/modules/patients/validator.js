/* 
  Purpose: Define validation rules for the Patients Module.
  Responsibility: Validate incoming create and update bodies against Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const createPatientSchema = z.object({
  name: z.string().min(1, 'Patient name is required.').max(150),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format.'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], {
    errorMap: () => ({ message: 'Gender must be MALE, FEMALE, or OTHER.' })
  }),
  mobile: z.string().min(1, 'Mobile phone is required.').max(20),
  address: z.string().optional().nullable(),
  referringDoctor: z.string().max(150).optional().nullable(),
  notes: z.string().optional().nullable(),
  pmjayNumber: z.string().max(100).optional().nullable(),
  consultingDoctorId: z.string().uuid('Must be a valid UUID.').optional().nullable()
});

const updatePatientSchema = z.object({
  name: z.string().min(1, 'Patient name is required.').max(150),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format.').optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  mobile: z.string().min(1, 'Mobile phone is required.').max(20),
  address: z.string().optional().nullable(),
  referringDoctor: z.string().max(150).optional().nullable(),
  notes: z.string().optional().nullable(),
  pmjayNumber: z.string().max(100).optional().nullable(),
  consultingDoctorId: z.string().uuid('Must be a valid UUID.').optional().nullable()
});

class PatientsValidator {
  constructor() {
    this.validateCreate = validateSchema(createPatientSchema);
    this.validateUpdate = validateSchema(updatePatientSchema);
  }
}

module.exports = PatientsValidator;
