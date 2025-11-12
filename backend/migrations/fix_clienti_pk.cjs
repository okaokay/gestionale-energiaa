const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'gestionale_energia.db');

function getColumns(db, tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

async function ensureTextPrimaryKey(db, tableName) {
  const cols = await getColumns(db, tableName);
  const idCol = cols.find(c => c.name === 'id');
  if (!idCol) {
    throw new Error(`${tableName}: colonna id mancante`);
  }
  const isText = (idCol.type || '').toUpperCase() === 'TEXT';
  const isPk = idCol.pk === 1;
  if (isText && isPk) {
    console.log(`✅ ${tableName}: id è già TEXT PRIMARY KEY`);
    return;
  }
  console.log(`🔧 ${tableName}: migrazione id -> TEXT PRIMARY KEY (attuale: ${idCol.type || 'UNKNOWN'} pk=${idCol.pk})`);

  const tempTable = `${tableName}_pk_fix_tmp`;
  const newCols = cols.map(c => {
    if (c.name === 'id') return 'id TEXT PRIMARY KEY';
    return `${c.name} ${c.type || ''}`.trim();
  });

  await run(db, `PRAGMA foreign_keys=OFF`);
  await run(db, 'BEGIN TRANSACTION');
  try {
    await run(db, `CREATE TABLE ${tempTable} (${newCols.join(', ')})`);
    const selectCols = cols.map(c => c.name === 'id' ? 'CAST(id AS TEXT) AS id' : c.name).join(', ');
    await run(db, `INSERT INTO ${tempTable} (${cols.map(c => c.name).join(', ')}) SELECT ${selectCols} FROM ${tableName}`);
    await run(db, `DROP TABLE ${tableName}`);
    await run(db, `ALTER TABLE ${tempTable} RENAME TO ${tableName}`);
    await run(db, 'COMMIT');
    console.log(`✅ ${tableName}: migrazione completata`);
  } catch (err) {
    console.error(`❌ ${tableName}: errore migrazione`, err);
    await run(db, 'ROLLBACK');
    throw err;
  } finally {
    await run(db, `PRAGMA foreign_keys=ON`);
  }
}

async function main() {
  console.log('🔍 Migrazione PK clienti: id -> TEXT PRIMARY KEY');
  console.log(`📁 DB: ${dbPath}`);
  const db = new sqlite3.Database(dbPath);
  try {
    await ensureTextPrimaryKey(db, 'clienti_privati');
    await ensureTextPrimaryKey(db, 'clienti_aziende');
    console.log('🎉 Migrazione completata');
  } catch (err) {
    console.error('❌ Migrazione fallita:', err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();