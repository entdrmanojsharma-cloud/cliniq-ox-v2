const jwt = require('jsonwebtoken');
const payload = {
  userId: "7365ee58-e516-4d24-9b36-e9fde836c55b",
  role: "ADMIN",
  hospitalId: "cf298403-d81a-421a-896d-2de965a77778",
  capabilities: ["ADMIN"]
};

const token1 = jwt.sign(payload, 'your-jwt-signing-key', { expiresIn: '1y' });
const token2 = jwt.sign(payload, '"your-jwt-signing-key"', { expiresIn: '1y' });

console.log('TOKEN1 (no quotes):', token1);
console.log('TOKEN2 (with quotes):', token2);
