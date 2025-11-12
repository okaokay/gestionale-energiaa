const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'gestionale_energia.db');

function hasColumn(db, table, col) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) return reject(err);
      resolve(rows.some(r => r.name === col));
    });
  });
}

function run(db, sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

async function ensureCreatedBy(db, table) {
  const exists = await hasColumn(db, table, 'created_by');
  if (exists) {
    console.log(`✅ ${table}: colonna created_by già presente`);
    return;
  }
  console.log(`🔧 ${table}: aggiungo colonna created_by`);
  await run(db, `ALTER TABLE ${table} ADD COLUMN created_by TEXT`);
}

async function main() {
  console.log('🔍 Migrazione: aggiunta created_by a contratti_luce/gas');
  console.log(`📁 DB: ${dbPath}`);
  const db = new sqlite3.Database(dbPath);
  try {
    await ensureCreatedBy(db, 'contratti_luce');
    await ensureCreatedBy(db, 'contratti_gas');
    console.log('🎉 Migrazione completata');
  } catch (err) {
    console.error('❌ Migrazione fallita:', err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();