const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const http = require('http');
const fs = require('fs');

(async () => {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst({where: {role: 'ADMIN'}});
  if (!user) return console.log('no user');
  
  const token = jwt.sign(
    { userId: user.id, email: user.username, role: user.role, hospitalId: user.hospitalId },
    process.env.JWT_SECRET || 'secret'
  );

  const req2 = http.request('http://localhost:3000/api/v1/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token,
      'x-hospital-id': user.hospitalId
    }
  }, (res2) => {
    console.log('POST /documents status:', res2.statusCode);
    console.log('Headers:', res2.headers);
    let chunks = [];
    res2.on('data', d => chunks.push(d));
    res2.on('end', () => {
      const pdfData = Buffer.concat(chunks);
      console.log('PDF Length:', pdfData.length);
      fs.writeFileSync('test-api.pdf', pdfData);
      console.log('PDF Head:', pdfData.toString('utf8', 0, 50));
    });
  });
  // Use a hardcoded estimate ID from earlier logs or find one
  const est = await prisma.estimate.findFirst();
  if(!est) return console.log('no estimate');
  req2.write(JSON.stringify({documentType: 'ESTIMATE', targetId: est.id}));
  req2.end();
})();
