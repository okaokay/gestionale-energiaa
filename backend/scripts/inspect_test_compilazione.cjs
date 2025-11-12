const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.join(process.cwd(), 'gestionale_energia.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

console.log('🔎 DB:', dbPath);

function showRows(label, rows) {
  console.log(`\n=== ${label} (${rows.length}) ===`);
  rows.forEach((r, i) => {
    console.log(`#${i+1}`, r);
  });
}

const privati = db.prepare(`
  SELECT rowid as _rowid_, *
  FROM clienti_privati
  WHERE (UPPER(nome) = 'TEST' AND UPPER(cognome) = 'COMPILAZIONE')
     OR codice_fiscale IN ('CMPTEST01A01A123A')
`).all();

showRows('clienti_privati', privati);

const aziende = db.prepare(`
  SELECT rowid as _rowid_, *
  FROM clienti_aziende
  WHERE UPPER(ragione_sociale) = 'TEST COMPILAZIONE'
     OR partita_iva IN ('00000000000')
     OR codice_fiscale IN ('CMPTEST01A01A123A')
`).all();

showRows('clienti_aziende', aziende);