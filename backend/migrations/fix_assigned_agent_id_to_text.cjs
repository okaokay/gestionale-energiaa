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

async function migrateAssignedAgentId(db, tableName) {
  const columns = await getColumns(db, tableName);
  const col = columns.find(c => c.name === 'assigned_agent_id');
  if (!col) {
    console.log(`ℹ️  ${tableName}: colonna assigned_agent_id non presente, skip.`);
    return;
  }
  if ((col.type || '').toUpperCase() === 'TEXT') {
    console.log(`✅ ${tableName}: assigned_agent_id è già TEXT, nessuna migrazione necessaria.`);
    return;
  }

  console.log(`🔧 ${tableName}: migrazione assigned_agent_id ${col.type} -> TEXT`);

  const colNames = columns.map(c => c.name);
  const newCols = columns.map(c => {
    if (c.name === 'assigned_agent_id') return 'assigned_agent_id TEXT';
    // Mantiene il tipo dichiarato originale per le altre colonne
    return `${c.name} ${c.type || ''}`.trim();
  });

  const tempTable = `${tableName}_new_tmp`;
  const createSQL = `CREATE TABLE ${tempTable} (${newCols.join(', ')})`;
  await run(db, `PRAGMA foreign_keys=OFF`);
  await run(db, 'BEGIN TRANSACTION');
  try {
    await run(db, createSQL);
    const selectCols = colNames.map(n => (n === 'assigned_agent_id' ? 'CAST(assigned_agent_id AS TEXT) AS assigned_agent_id' : n)).join(', ');
    await run(db, `INSERT INTO ${tempTable} (${colNames.join(', ')}) SELECT ${selectCols} FROM ${tableName}`);
    await run(db, `DROP TABLE ${tableName}`);
    await run(db, `ALTER TABLE ${tempTable} RENAME TO ${tableName}`);
    await run(db, 'COMMIT');
    console.log(`✅ ${tableName}: migrazione completata.`);
  } catch (err) {
    console.error(`❌ ${tableName}: errore migrazione`, err);
    await run(db, 'ROLLBACK');
    throw err;
  } finally {
    await run(db, `PRAGMA foreign_keys=ON`);
  }
}

async function main() {
  console.log('🔍 Migrazione: assigned_agent_id -> TEXT');
  console.log(`📁 DB: ${dbPath}`);
  const db = new sqlite3.Database(dbPath);
  try {
    await migrateAssignedAgentId(db, 'clienti_privati');
    await migrateAssignedAgentId(db, 'clienti_aziende');
    console.log('🎉 Migrazione completata');
  } catch (err) {
    console.error('❌ Migrazione fallita:', err.message);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();