/**
 * Script di pulizia: elimina clienti di test "Test Compilazione"
 *
 * - Rimuove da `clienti_privati` i record con nome/cognome "Test Compilazione"
 *   o con codice fiscale fittizio usato nei test.
 * - Rimuove da `clienti_aziende` eventuali record con ragione sociale "Test Compilazione".
 * - Grazie alle FK ON DELETE CASCADE, contratti collegati saranno eliminati automaticamente.
 */

const Database = require('better-sqlite3');
const path = require('path');

// Determina il percorso del DB
const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'gestionale_energia.db');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('✅ Connessione DB:', dbPath);

function count(table, where = '1=1') {
  const stmt = db.prepare(`SELECT COUNT(*) AS c FROM ${table} WHERE ${where}`);
  const row = stmt.get();
  return row.c || 0;
}

function getPrivatiTest() {
  const stmt = db.prepare(`
    SELECT rowid as _rowid_, id, nome, cognome, codice_fiscale
    FROM clienti_privati
    WHERE (
      UPPER(nome) = 'TEST' AND UPPER(cognome) = 'COMPILAZIONE'
    )
    OR codice_fiscale IN (
      'CMPTEST01A01A123A'
    )
  `);
  return stmt.all();
}

function getAziendeTest() {
  const stmt = db.prepare(`
    SELECT rowid as _rowid_, id, ragione_sociale, partita_iva, codice_fiscale
    FROM clienti_aziende
    WHERE UPPER(ragione_sociale) = 'TEST COMPILAZIONE'
       OR partita_iva IN ('00000000000')
       OR codice_fiscale IN ('CMPTEST01A01A123A')
  `);
  return stmt.all();
}

function removePrivatiByCondition() {
  const del = db.prepare(`
    DELETE FROM clienti_privati
    WHERE (
      UPPER(nome) = 'TEST' AND UPPER(cognome) = 'COMPILAZIONE'
    ) OR codice_fiscale IN ('CMPTEST01A01A123A')
  `);
  return del.run();
}

function removeAziendeByCondition() {
  const del = db.prepare(`
    DELETE FROM clienti_aziende
    WHERE UPPER(ragione_sociale) = 'TEST COMPILAZIONE'
       OR partita_iva IN ('00000000000')
       OR codice_fiscale IN ('CMPTEST01A01A123A')
  `);
  return del.run();
}

function main() {
  console.log('🔍 Ricerca record di test...');
  const privatiPrima = getPrivatiTest();
  const aziendePrima = getAziendeTest();

  console.log(`📊 Trovati privati test: ${privatiPrima.length}`);
  privatiPrima.forEach(p => console.log(`   - ${p.nome} ${p.cognome} [CF: ${p.codice_fiscale}] id=${p.id}`));
  console.log(`📊 Trovate aziende test: ${aziendePrima.length}`);
  aziendePrima.forEach(a => console.log(`   - ${a.ragione_sociale} [PIVA: ${a.partita_iva}] id=${a.id}`));

  if (privatiPrima.length === 0 && aziendePrima.length === 0) {
    console.log('✅ Nessun record di test da eliminare.');
    return;
  }

  const txn = db.transaction(() => {
    if (privatiPrima.length > 0) {
      const r = removePrivatiByCondition();
      console.log(`🗑️  Eliminati privati (changes=${r.changes})`);
    }
    if (aziendePrima.length > 0) {
      const r = removeAziendeByCondition();
      console.log(`🗑️  Eliminate aziende (changes=${r.changes})`);
    }
  });

  try {
    txn();
    console.log('✅ Eliminazione completata.');
  } catch (err) {
    console.error('❌ Errore durante l\'eliminazione:', err.message);
    process.exitCode = 1;
  }

  const privatiDopo = getPrivatiTest();
  const aziendeDopo = getAziendeTest();
  console.log(`📉 Privati test residui: ${privatiDopo.length}`);
  console.log(`📉 Aziende test residui: ${aziendeDopo.length}`);
}

main();