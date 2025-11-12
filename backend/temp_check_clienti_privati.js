const Database = require('better-sqlite3');

function main() {
  const dbPath = process.env.DATABASE_PATH || require('path').join(process.cwd(), 'gestionale_energia.db');
  const db = new Database(dbPath);
  const rows = db.prepare("PRAGMA table_info('clienti_privati')").all();
  console.log('DB:', dbPath);
  console.log('Colonne clienti_privati:', rows.map(r => r.name));
}

main();