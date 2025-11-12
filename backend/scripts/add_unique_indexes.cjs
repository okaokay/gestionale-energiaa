// Aggiunge indici UNIQUE necessari per gli UPSERT su SQLite
// - clienti_privati(codice_fiscale)
// - clienti_privati(email_principale)
// - clienti_aziende(partita_iva) (idempotente, se manca)

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

function main() {
  // Rispetta DATABASE_PATH se presente, altrimenti usa database in root del progetto
  const dbPath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(process.cwd(), 'gestionale_energia.db');
  if (!fs.existsSync(dbPath)) {
    console.error(`❌ Database non trovato: ${dbPath}`);
    process.exit(1);
  }

  // Backup prima delle modifiche
  const backupsDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupsDir, `gestionale_energia.${timestamp}.db.bak`);
  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`🗄️  Backup creato: ${backupPath}`);
  } catch (e) {
    console.warn(`⚠️  Impossibile creare backup: ${e.message}`);
  }

  const db = new Database(dbPath);
  try {
    db.pragma('foreign_keys = ON');

    // Utility: verifica se esiste un indice (per nome)
    function hasIndex(table, indexName) {
      const rows = db.prepare(`PRAGMA index_list(${table})`).all();
      return rows.some(r => String(r.name) === indexName);
    }

    // Crea indici UNIQUE idempotenti
    const statements = [];

    if (!hasIndex('clienti_privati', 'uq_clienti_privati_cf')) {
      statements.push('CREATE UNIQUE INDEX IF NOT EXISTS uq_clienti_privati_cf ON clienti_privati(codice_fiscale)');
    }
    if (!hasIndex('clienti_privati', 'uq_clienti_privati_email')) {
      statements.push('CREATE UNIQUE INDEX IF NOT EXISTS uq_clienti_privati_email ON clienti_privati(email_principale)');
    }
    if (!hasIndex('clienti_aziende', 'uq_clienti_aziende_piva')) {
      statements.push('CREATE UNIQUE INDEX IF NOT EXISTS uq_clienti_aziende_piva ON clienti_aziende(partita_iva)');
    }

    if (statements.length === 0) {
      console.log('✅ Indici già presenti. Nessuna modifica necessaria.');
    } else {
      const tx = db.transaction((stmts) => {
        for (const sql of stmts) {
          db.prepare(sql).run();
          console.log(`✅ Creato indice: ${sql}`);
        }
      });
      tx(statements);
      console.log('🎉 Migrazione indici completata.');
    }

    // Report finale indici
    function reportIndexes(table) {
      const rows = db.prepare(`PRAGMA index_list(${table})`).all();
      console.log(`\n📋 Indici su ${table}:`);
      rows.forEach(r => {
        console.log(` - ${r.name} (unique=${r.unique ? 'yes' : 'no'})`);
      });
    }
    reportIndexes('clienti_privati');
    reportIndexes('clienti_aziende');

  } catch (err) {
    console.error('❌ Errore migrazione indici:', err.message);
    process.exit(1);
  } finally {
    try { db.close(); } catch {}
  }
}

main();