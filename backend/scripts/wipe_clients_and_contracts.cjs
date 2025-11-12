/**
 * Wipe mirato dei dati correnti:
 * - Esegue un backup del DB SQLite
 * - Svuota tabelle dominio: contratti, documenti, storico, tasks, offerte, ai_matches
 * - Svuota clienti_privati e clienti_aziende
 * - Mantiene utenti e configurazioni
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'gestionale_energia.db');

const backupDir = path.join(process.cwd(), 'backups');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `gestionale_energia.${timestamp}.db.bak`);

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function backupDB() {
  ensureDir(backupDir);
  fs.copyFileSync(dbPath, backupPath);
  console.log('🗂️  Backup creato:', backupPath);
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Ordine: prima figlie, poi genitori
const childTables = [
  'storico_prezzi',
  'documenti',
  'tasks',
  'offerte',
  'ai_matches',
  'clienti_newsletter'
];

const contractTables = [
  'contratti_luce',
  'contratti_gas'
];

const clientTables = [
  'clienti_privati',
  'clienti_aziende'
];

function safeDelete(table) {
  try {
    const res = db.prepare(`DELETE FROM ${table}`).run();
    console.log(`🗑️  ${table}: rows deleted = ${res.changes}`);
  } catch (err) {
    console.warn(`⚠️  Errore cancellando ${table}:`, err.message);
  }
}

function count(table) {
  try {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM ${table}`).get();
    return row?.c ?? 0;
  } catch {
    return null;
  }
}

function verifyCounts() {
  const tables = [...childTables, ...contractTables, ...clientTables];
  console.log('\n📊 Conteggi post-pulizia:');
  for (const t of tables) {
    const c = count(t);
    if (c === null) console.log(`- ${t}: tabella non presente`);
    else console.log(`- ${t}: ${c}`);
  }
}

function main() {
  console.log('✅ DB:', dbPath);
  backupDB();

  const txn = db.transaction(() => {
    for (const t of childTables) safeDelete(t);
    for (const t of contractTables) safeDelete(t);
    for (const t of clientTables) safeDelete(t);
  });

  try {
    txn();
    console.log('✅ Pulizia completata.');
  } catch (err) {
    console.error('❌ Errore durante la pulizia:', err.message);
    process.exitCode = 1;
  }

  verifyCounts();
}

main();