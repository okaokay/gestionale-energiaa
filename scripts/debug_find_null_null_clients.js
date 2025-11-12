const Database = require('better-sqlite3');

function getDbPath() {
  const envPath = process.env.DATABASE_PATH || process.env.DB_PATH;
  return envPath || '/app/gestionale_energia.db';
}

function run() {
  const db = new Database(getDbPath());
  const rowsPriv = db.prepare(`
    SELECT id, nome, cognome FROM clienti_privati
    WHERE LOWER(COALESCE(nome,'')) LIKE '%null%'
       OR LOWER(COALESCE(cognome,'')) LIKE '%null%'
    LIMIT 20
  `).all();
  const rowsAz = db.prepare(`
    SELECT id, ragione_sociale FROM clienti_aziende
    WHERE LOWER(COALESCE(ragione_sociale,'')) LIKE '%null%'
    LIMIT 20
  `).all();
  console.log('Privati sospetti (max 20):');
  rowsPriv.forEach(r => console.log(r));
  console.log('Aziende sospette (max 20):');
  rowsAz.forEach(r => console.log(r));
  console.log(`Tot privati: ${rowsPriv.length}, tot aziende: ${rowsAz.length}`);
  db.close();
}

run();