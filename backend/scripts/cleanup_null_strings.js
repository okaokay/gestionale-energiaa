const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Percorso DB (adatta se diverso nel tuo ambiente)
const dbPath = path.join(__dirname, '..', 'gestionale_energia.db');

function isPlaceholder(value) {
  if (value === undefined || value === null) return true;
  const s = String(value).trim().toLowerCase();
  if (!s) return true;
  return ['null', 'undefined', '-', 'n/a', 'na', 'vuoto', 'manca', 'missing'].includes(s);
}

function cleanup() {
  const db = new sqlite3.Database(dbPath);

  console.log('🧹 Pulizia valori stringa "null" e placeholder nelle tabelle clienti...');
  db.serialize(() => {
    db.run('BEGIN');

    // Clienti privati: nome/cognome/email/pec
    db.run(`UPDATE clienti_privati SET nome = NULL WHERE LOWER(TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(nome,'<div>',''),' </div>',''),'</div>',''),'<span>',''),'</span>',''),'<p>',''),'</p>',''),'<br>',''),'<br/>',''))) IN ('null','-','n/a','na','undefined','vuoto','manca','missing','div','span','br','p','')`);
    db.run(`UPDATE clienti_privati SET cognome = NULL WHERE LOWER(TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(cognome,'<div>',''),' </div>',''),'</div>',''),'<span>',''),'</span>',''),'<p>',''),'</p>',''),'<br>',''),'<br/>',''))) IN ('null','-','n/a','na','undefined','vuoto','manca','missing','div','span','br','p','')`);
    db.run(`UPDATE clienti_privati SET email_principale = NULL WHERE email_principale IN ('null','NULL','-','n/a','na','undefined')`);
    db.run(`UPDATE clienti_privati SET pec = NULL WHERE pec IN ('null','NULL','-','n/a','na','undefined')`);

    // Clienti aziende: ragione_sociale e campi referente
    db.run(`UPDATE clienti_aziende SET ragione_sociale = NULL WHERE LOWER(TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ragione_sociale,'<div>',''),' </div>',''),'</div>',''),'<span>',''),'</span>',''),'<p>',''),'</p>',''),'<br>',''),'<br/>',''))) IN ('null','-','n/a','na','undefined','vuoto','manca','missing','div','span','br','p','')`);
    db.run(`UPDATE clienti_aziende SET nome_referente = NULL WHERE LOWER(TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(nome_referente,'<div>',''),' </div>',''),'</div>',''),'<span>',''),'</span>',''),'<p>',''),'</p>',''),'<br>',''),'<br/>',''))) IN ('null','-','n/a','na','undefined','vuoto','manca','missing','div','span','br','p','')`);
    db.run(`UPDATE clienti_aziende SET cognome_referente = NULL WHERE LOWER(TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(cognome_referente,'<div>',''),' </div>',''),'</div>',''),'<span>',''),'</span>',''),'<p>',''),'</p>',''),'<br>',''),'<br/>',''))) IN ('null','-','n/a','na','undefined','vuoto','manca','missing','div','span','br','p','')`);
    db.run(`UPDATE clienti_aziende SET email_referente = NULL WHERE email_referente IN ('null','NULL','-','n/a','na','undefined')`);

    // Rimuove tag HTML residui se presenti e trimma
    const htmlClean = (col) => `TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${col},'<div>',''),'</div>',''),'<span>',''),'</span>',''),'<p>',''),'</p>',''),'<br>',''),'<br/>','')))`;
    // Applica pulizia su colonne testuali principali, mantenendo stringa pulita o NULL se vuota
    db.run(`UPDATE clienti_privati SET nome = NULLIF(${htmlClean('nome')}, ''), cognome = NULLIF(${htmlClean('cognome')}, '')`);
    db.run(`UPDATE clienti_aziende SET ragione_sociale = NULLIF(${htmlClean('ragione_sociale')}, ''), nome_referente = NULLIF(${htmlClean('nome_referente')}, ''), cognome_referente = NULLIF(${htmlClean('cognome_referente')}, '')`);

    db.run('COMMIT', (err) => {
      if (err) {
        console.error('❌ Errore commit pulizia:', err);
      } else {
        console.log('✅ Pulizia completata. I placeholder sono stati convertiti in NULL.');
      }
      db.close();
    });
  });
}

cleanup();