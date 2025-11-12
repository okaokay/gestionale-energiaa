const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'gestionale_energia.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Errore connessione DB:', err.message);
    process.exit(1);
  }
});

const clienteNome = process.argv[2] || "LEONARDO";
const clienteCognome = process.argv[3] || "D'EGIDIO";

db.get(
  "SELECT id, nome, cognome, assigned_agent_id FROM clienti_privati WHERE UPPER(nome)=UPPER(?) AND UPPER(cognome)=UPPER(?)",
  [clienteNome, clienteCognome],
  (err, row) => {
    if (err) {
      console.error('Errore query cliente_privato:', err.message);
      db.close();
      process.exit(1);
    }
    console.log('Cliente:', row);
    if (!row) {
      console.log('Cliente non trovato');
      db.close();
      process.exit(0);
    }
    db.get(
      "SELECT id, email, nome, cognome FROM users WHERE id = ?",
      [row.assigned_agent_id],
      (err2, user) => {
        if (err2) {
          console.error('Errore query users:', err2.message);
        } else {
          console.log('Utente (users) con ID assegnato:', user || null);
        }
        db.get(
          "SELECT id, email, nome, cognome FROM agenti WHERE id = ?",
          [row.assigned_agent_id],
          (err3, agente) => {
            if (err3) {
              console.error('Errore query agenti:', err3.message);
            } else {
              console.log('Agente (tabella agenti) con ID assegnato:', agente || null);
            }
            db.close();
          }
        );
      }
    );
  }
);