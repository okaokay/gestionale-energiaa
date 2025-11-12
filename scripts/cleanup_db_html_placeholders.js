// Clean up HTML tags and placeholder strings in SQLite DB using better-sqlite3
const Database = require('better-sqlite3');

function getDbPath() {
  // Try env var first, fallback to default path used in compose
  const envPath = process.env.DATABASE_PATH || process.env.DB_PATH;
  if (envPath) return envPath;
  // Default fallback aligned to new compose: /app/data/gestionale_energia.db
  return '/app/data/gestionale_energia.db';
}

function cleanup() {
  const dbPath = getDbPath();
  const db = new Database(dbPath);
  console.log(`🧹 Pulizia DB: ${dbPath}`);

  const run = (sql) => {
    try {
      const info = db.prepare(sql).run();
      return info.changes || 0;
    } catch (e) {
      console.error('❌ Errore SQL:', e.message);
      return 0;
    }
  };

  db.exec('BEGIN');

  // Pulizia HTML per clienti_privati.nome/cognome
  let changes = 0;
  changes += run(`UPDATE clienti_privati SET nome = REPLACE(nome, '<div>', '')`);
  changes += run(`UPDATE clienti_privati SET nome = REPLACE(nome, '</div>', '')`);
  changes += run(`UPDATE clienti_privati SET nome = REPLACE(nome, '<span>', '')`);
  changes += run(`UPDATE clienti_privati SET nome = REPLACE(nome, '</span>', '')`);
  changes += run(`UPDATE clienti_privati SET nome = REPLACE(nome, '<p>', '')`);
  changes += run(`UPDATE clienti_privati SET nome = REPLACE(nome, '</p>', '')`);
  changes += run(`UPDATE clienti_privati SET nome = REPLACE(nome, '<br>', ' ')`);
  changes += run(`UPDATE clienti_privati SET nome = REPLACE(nome, '<br/>', ' ')`);
  changes += run(`UPDATE clienti_privati SET nome = REPLACE(nome, '&nbsp;', ' ')`);
  changes += run(`UPDATE clienti_privati SET cognome = REPLACE(cognome, '<div>', '')`);
  changes += run(`UPDATE clienti_privati SET cognome = REPLACE(cognome, '</div>', '')`);
  changes += run(`UPDATE clienti_privati SET cognome = REPLACE(cognome, '<span>', '')`);
  changes += run(`UPDATE clienti_privati SET cognome = REPLACE(cognome, '</span>', '')`);
  changes += run(`UPDATE clienti_privati SET cognome = REPLACE(cognome, '<p>', '')`);
  changes += run(`UPDATE clienti_privati SET cognome = REPLACE(cognome, '</p>', '')`);
  changes += run(`UPDATE clienti_privati SET cognome = REPLACE(cognome, '<br>', ' ')`);
  changes += run(`UPDATE clienti_privati SET cognome = REPLACE(cognome, '<br/>', ' ')`);
  changes += run(`UPDATE clienti_privati SET cognome = REPLACE(cognome, '&nbsp;', ' ')`);

  // Pulizia HTML per clienti_aziende.ragione_sociale/nome_referente/cognome_referente
  changes += run(`UPDATE clienti_aziende SET ragione_sociale = REPLACE(ragione_sociale, '<div>', '')`);
  changes += run(`UPDATE clienti_aziende SET ragione_sociale = REPLACE(ragione_sociale, '</div>', '')`);
  changes += run(`UPDATE clienti_aziende SET ragione_sociale = REPLACE(ragione_sociale, '<span>', '')`);
  changes += run(`UPDATE clienti_aziende SET ragione_sociale = REPLACE(ragione_sociale, '</span>', '')`);
  changes += run(`UPDATE clienti_aziende SET ragione_sociale = REPLACE(ragione_sociale, '<p>', '')`);
  changes += run(`UPDATE clienti_aziende SET ragione_sociale = REPLACE(ragione_sociale, '</p>', '')`);
  changes += run(`UPDATE clienti_aziende SET ragione_sociale = REPLACE(ragione_sociale, '<br>', ' ')`);
  changes += run(`UPDATE clienti_aziende SET ragione_sociale = REPLACE(ragione_sociale, '<br/>', ' ')`);
  changes += run(`UPDATE clienti_aziende SET ragione_sociale = REPLACE(ragione_sociale, '&nbsp;', ' ')`);
  changes += run(`UPDATE clienti_aziende SET nome_referente = REPLACE(nome_referente, '<div>', '')`);
  changes += run(`UPDATE clienti_aziende SET nome_referente = REPLACE(nome_referente, '</div>', '')`);
  changes += run(`UPDATE clienti_aziende SET nome_referente = REPLACE(nome_referente, '<span>', '')`);
  changes += run(`UPDATE clienti_aziende SET nome_referente = REPLACE(nome_referente, '</span>', '')`);
  changes += run(`UPDATE clienti_aziende SET nome_referente = REPLACE(nome_referente, '<p>', '')`);
  changes += run(`UPDATE clienti_aziende SET nome_referente = REPLACE(nome_referente, '</p>', '')`);
  changes += run(`UPDATE clienti_aziende SET nome_referente = REPLACE(nome_referente, '<br>', ' ')`);
  changes += run(`UPDATE clienti_aziende SET nome_referente = REPLACE(nome_referente, '<br/>', ' ')`);
  changes += run(`UPDATE clienti_aziende SET nome_referente = REPLACE(nome_referente, '&nbsp;', ' ')`);
  changes += run(`UPDATE clienti_aziende SET cognome_referente = REPLACE(cognome_referente, '<div>', '')`);
  changes += run(`UPDATE clienti_aziende SET cognome_referente = REPLACE(cognome_referente, '</div>', '')`);
  changes += run(`UPDATE clienti_aziende SET cognome_referente = REPLACE(cognome_referente, '<span>', '')`);
  changes += run(`UPDATE clienti_aziende SET cognome_referente = REPLACE(cognome_referente, '</span>', '')`);
  changes += run(`UPDATE clienti_aziende SET cognome_referente = REPLACE(cognome_referente, '<p>', '')`);
  changes += run(`UPDATE clienti_aziende SET cognome_referente = REPLACE(cognome_referente, '</p>', '')`);
  changes += run(`UPDATE clienti_aziende SET cognome_referente = REPLACE(cognome_referente, '<br>', ' ')`);
  changes += run(`UPDATE clienti_aziende SET cognome_referente = REPLACE(cognome_referente, '<br/>', ' ')`);
  changes += run(`UPDATE clienti_aziende SET cognome_referente = REPLACE(cognome_referente, '&nbsp;', ' ')`);

  // Converti placeholder e vuoti in NULL
  changes += run(`UPDATE clienti_privati SET nome = NULL WHERE LOWER(TRIM(nome)) IN ('null','-','n/a','na','undefined','vuoto','manca','missing','div','span','br','p','')`);
  changes += run(`UPDATE clienti_privati SET cognome = NULL WHERE LOWER(TRIM(cognome)) IN ('null','-','n/a','na','undefined','vuoto','manca','missing','div','span','br','p','')`);
  changes += run(`UPDATE clienti_aziende SET ragione_sociale = NULL WHERE LOWER(TRIM(ragione_sociale)) IN ('null','-','n/a','na','undefined','vuoto','manca','missing','div','span','br','p','')`);
  changes += run(`UPDATE clienti_aziende SET nome_referente = NULL WHERE LOWER(TRIM(nome_referente)) IN ('null','-','n/a','na','undefined','vuoto','manca','missing','div','span','br','p','')`);
  changes += run(`UPDATE clienti_aziende SET cognome_referente = NULL WHERE LOWER(TRIM(cognome_referente)) IN ('null','-','n/a','na','undefined','vuoto','manca','missing','div','span','br','p','')`);
  changes += run(`UPDATE clienti_privati SET email_principale = NULL WHERE LOWER(TRIM(email_principale)) IN ('null','-','n/a','na','undefined','')`);
  changes += run(`UPDATE clienti_privati SET pec = NULL WHERE LOWER(TRIM(pec)) IN ('null','-','n/a','na','undefined','')`);
  changes += run(`UPDATE clienti_aziende SET email_referente = NULL WHERE LOWER(TRIM(email_referente)) IN ('null','-','n/a','na','undefined','')`);

  db.exec('COMMIT');
  console.log(`✅ Pulizia completata. Righe modificate: ${changes}`);
  db.close();
}

cleanup();