const bcrypt = require('bcryptjs');

const hashAdmin = '$2b$10$54YhI5Ql.R7pLe/lciMFteYqLPa/RbRKVnGQfpZCFTRrGiuDVieRK'; // admin@cliniqox.com
const hashAdminTest = '$2b$10$6XIjQRYeqFtXORVpKFwj5.ed3vUTCvBKu91vgUt.5LPohUFM2xsQq'; // admin.test@cliniqox.com

const passwords = ['adminpassword123', 'password123', 'admin123', 'password'];

for (let p of passwords) {
  if (bcrypt.compareSync(p, hashAdmin)) {
    console.log(`admin@cliniqox.com password matches: "${p}"`);
  }
  if (bcrypt.compareSync(p, hashAdminTest)) {
    console.log(`admin.test@cliniqox.com password matches: "${p}"`);
  }
}
