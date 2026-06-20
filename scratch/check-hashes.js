const bcrypt = require('bcryptjs');

const hash = '$2b$10$WZ3mM7KgUjJ41vOz4NZQo.1mewPPQxELTDF2kBDw45Zjz12gxpmMG';
const candidates = [
  'admin',
  'adminflorence',
  'password',
  'password123',
  'florence',
  'cliniqox',
  '123456',
  '12345678',
  'admin123',
  'Man मनोज Manoj 6388803534 manoj123',
  'manoj',
  'manoj123',
  'drmanoj',
  'drmanojsharma',
  'drmanojsharma123',
];

async function check() {
  for (const c of candidates) {
    const match = await bcrypt.compare(c, hash);
    if (match) {
      console.log(`MATCH FOUND: "${c}"`);
      return;
    }
  }
  console.log('No match found.');
}

check();
