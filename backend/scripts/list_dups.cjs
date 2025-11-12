const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'gestionale_energia.db');

if (!fs.existsSync(dbPath)) {
  console.error('❌ DB non trovato:', dbPath);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function listDup(table, col) {
  const sql = `SELECT ${col} AS k, COUNT(*) c FROM ${table} WHERE ${col} IS NOT NULL AND TRIM(${col})<>'' GROUP BY ${col} HAVING COUNT(*)>1`;
  const dups = db.prepare(sql).all();
  console.log(`\n🔍 Duplicati ${table}.${col}:`, dups.length);
  for (const d of dups) {
    const rows = db.prepare(`SELECT id, ${col}, created_at, updated_at FROM ${table} WHERE ${col}=?`).all(d.k);
    console.log('Key', d.k, 'rows', rows);
  }
}

listDup('clienti_privati', 'codice_fiscale');
listDup('clienti_privati', 'email_principale');
listDup('clienti_aziende', 'partita_iva');

db.close();
console.log('\n✅ Analisi duplicati completata.');