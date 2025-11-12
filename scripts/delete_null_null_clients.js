// Elimina dal DB i clienti "null null" e record palesemente vuoti
const Database = require('better-sqlite3');

function getDbPath() {
  const envPath = process.env.DATABASE_PATH || process.env.DB_PATH;
  return envPath || '/app/gestionale_energia.db';
}

function del() {
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  console.log(`🗑️ Eliminazione record null/null dal DB: ${dbPath}`);

  const run = (sql, params = []) => {
    try {
      const info = db.prepare(sql).run(params);
      return info.changes || 0;
    } catch (e) {
      console.error('❌ Errore SQL:', e.message);
      return 0;
    }
  };

  db.exec('BEGIN');

  // Clienti privati: elimina dove nome e cognome sono "null"/"-"/vuoti (indipendentemente dagli altri campi)
  const deletedPrivati = run(`
    DELETE FROM clienti_privati
    WHERE (
      (nome IS NULL OR TRIM(LOWER(nome)) IN ('null','-','null null',''))
      AND (cognome IS NULL OR TRIM(LOWER(cognome)) IN ('null','-',''))
    )
    OR (
      TRIM(LOWER(nome)) = 'null null' AND (cognome IS NULL OR TRIM(LOWER(cognome)) IN ('null','-',''))
    )
  `);

  // Clienti aziende: elimina dove ragione_sociale è "null null"/"null"/vuota e senza PI/email
  const deletedAziende = run(`
    DELETE FROM clienti_aziende
    WHERE TRIM(LOWER(ragione_sociale)) IN ('null null','null','-','')
    AND (partita_iva IS NULL OR TRIM(partita_iva) = '')
    AND (email_referente IS NULL OR TRIM(email_referente) = '')
  `);

  db.exec('COMMIT');
  console.log(`✅ Eliminazione completata. Privati eliminati: ${deletedPrivati}, Aziende eliminate: ${deletedAziende}`);
  db.close();
}

del();