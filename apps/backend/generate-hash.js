const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'SuperAdmin@2025';
  const hash = await bcrypt.hash(password, 10);
  console.log('Hash para SuperAdmin@2025:');
  console.log(hash);
}

generateHash();
