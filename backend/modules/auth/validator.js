/* 
  Purpose: Define validation rules for the Authentication Module.
  Responsibility: Validate incoming signup and login request bodies against strict Zod schemas.
*/

const { z } = require('zod');
const validateSchema = require('../../utils/validate');

const signupSchema = z.object({
  hospitalCode: z.string().min(1, 'Hospital code is required.'),
  username: z.string().min(3, 'Username / User ID must be at least 3 characters long.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  role: z.enum(['RECEPTIONIST', 'DOCTOR', 'ADMIN', 'SUPER_ADMIN'], {
    errorMap: () => ({ message: 'Role must be RECEPTIONIST, DOCTOR, ADMIN, or SUPER_ADMIN.' })
  }).optional().nullable(),
  firstName: z.string().max(100).optional().nullable(),
  lastName: z.string().max(100).optional().nullable(),
  staffType: z.string().max(100).optional().nullable(),
  qualification: z.string().max(100).optional().nullable(),
  specialty: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  licenseNumber: z.string().max(100).optional().nullable(),
  experience: z.string().max(50).optional().nullable(),
  mobileNumber: z.string().max(20).optional().nullable(),
  email: z.string().max(100).optional().nullable(),
  digitalSignature: z.string().optional().nullable()
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username / User ID is required.'),
  password: z.string().min(1, 'Password is required.')
});

class AuthValidator {
  constructor() {
    this.validateSignup = validateSchema(signupSchema);
    this.validateLogin = validateSchema(loginSchema);
  }
}

module.exports = AuthValidator;
