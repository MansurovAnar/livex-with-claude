require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../../config/database');

async function seed() {
  const client = await pool.connect();
  try {
    const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
      await client.query(sql);
      console.log(`  seeded: ${file}`);
    }
    console.log('Seeding complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => { console.error(err); process.exit(1); });
