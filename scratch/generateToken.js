require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-signing-key';

(async () => {
  const hospital = await prisma.hospitalProfile.findUnique({ where: { code: 'CLKOX' } });
  if (!hospital) {
    console.log('Hospital CLKOX not found');
    process.exit(1);
  }
  
  // Find or create a user
  let user = await prisma.user.findFirst({ where: { email: 'admin@cliniqox.com' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        hospitalId: hospital.id,
        email: 'admin@cliniqox.com',
        passwordHash: 'dummy',
        role: 'ADMIN'
      }
    });
  }

  const payload = {
    userId: user.id,
    role: user.role,
    hospitalId: hospital.id,
    capabilities: ['ADMIN']
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1y' });
  console.log('TOKEN:', token);
  console.log('HOSPITAL_ID:', hospital.id);
  console.log('USER_ID:', user.id);
  
  await prisma.$disconnect();
})();
