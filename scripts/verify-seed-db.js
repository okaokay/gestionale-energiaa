const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function logOk(msg) { console.log(`✅ ${msg}`); }
function logWarn(msg) { console.log(`⚠️  ${msg}`); }
function logErr(msg) { console.log(`❌ ${msg}`); }

const seedDbPath = path.join(process.cwd(), 'seed_data', 'gestionale_energia_seed.db');

const requiredTables = [
  'configurazioni',
  'clienti_privati',
  'clienti_aziende',
  'email_templates',
  'email_campaigns',
  'email_logs',
  'cliente_azioni',
  'cliente_promemoria',
  'cliente_ai_suggerimenti',
  'cliente_sms',
];

try {
  if (!fs.existsSync(seedDbPath)) {
    logErr(`Seed DB non trovato: ${seedDbPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(seedDbPath);
  if (stats.size === 0) {
    logErr('Seed DB è vuoto.');
    process.exit(1);
  }

  const db = new Database(seedDbPath, { readonly: true });
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  const tableNames = new Set(tables.map(t => t.name));

  let ok = true;
  for (const t of requiredTables) {
    if (!tableNames.has(t)) {
      logErr(`Tabella mancante nel seed: ${t}`);
      ok = false;
    } else {
      logOk(`Tabella presente: ${t}`);
    }
  }

  // Controlli di colonne critiche
  const checkColumns = [
    { table: 'clienti_privati', columns: ['data_ultimo_contatto', 'tipo_ultimo_contatto'] },
    { table: 'clienti_aziende', columns: ['data_ultimo_contatto', 'tipo_ultimo_contatto'] },
  ];

  for (const { table, columns } of checkColumns) {
    if (tableNames.has(table)) {
      const pragma = db.prepare(`PRAGMA table_info(${table})`).all();
      const colNames = new Set(pragma.map(c => c.name));
      for (const c of columns) {
        if (!colNames.has(c)) {
          logWarn(`Colonna mancante in ${table}: ${c} (verrà aggiunta in migrazione runtime)`);
        } else {
          logOk(`Colonna presente in ${table}: ${c}`);
        }
      }
    }
  }

  // Check dati di esempio: almeno un template email e un cliente
  try {
    const tmplCount = db.prepare('SELECT COUNT(*) as c FROM email_templates').get()?.c ?? 0;
    const privCount = db.prepare('SELECT COUNT(*) as c FROM clienti_privati').get()?.c ?? 0;
    const azCount = db.prepare('SELECT COUNT(*) as c FROM clienti_aziende').get()?.c ?? 0;
    console.log(`ℹ️  Templates: ${tmplCount}, Privati: ${privCount}, Aziende: ${azCount}`);
  } catch (e) {
    logWarn(`Impossibile contare righe: ${e.message}`);
  }

  if (!ok) {
    logErr('Verifica seed DB fallita: mancano tabelle obbligatorie.');
    process.exit(2);
  }

  logOk('Seed DB verificato con successo. Pronto per deploy.');
  process.exit(0);
} catch (err) {
  logErr(`Errore verifica seed DB: ${err.message}`);
  process.exit(1);
}