/**
 * Script per verificare gli utenti esistenti nel database
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'backend', 'database', 'gestionale.db');

function checkUsers() {
    console.log('🔍 Verifica utenti nel database');
    console.log('=' .repeat(50));

    const db = new sqlite3.Database(DB_PATH, (err) => {
        if (err) {
            console.error('❌ Errore connessione database:', err.message);
            return;
        }
        console.log('✅ Connesso al database SQLite');
    });

    // Verifica se la tabella users esiste
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='users'", (err, row) => {
        if (err) {
            console.error('❌ Errore verifica tabella users:', err.message);
            return;
        }

        if (!row) {
            console.log('⚠️ Tabella users non trovata');
            db.close();
            return;
        }

        console.log('✅ Tabella users trovata');

        // Mostra tutti gli utenti
        db.all("SELECT id, email, ruolo, nome, cognome, attivo FROM users", (err, rows) => {
            if (err) {
                console.error('❌ Errore lettura utenti:', err.message);
                return;
            }

            console.log(`\n📊 Trovati ${rows.length} utenti:`);
            
            if (rows.length === 0) {
                console.log('⚠️ Nessun utente trovato nel database');
            } else {
                rows.forEach((user, index) => {
                    console.log(`\n${index + 1}. ${user.email}`);
                    console.log(`   - ID: ${user.id}`);
                    console.log(`   - Nome: ${user.nome || 'N/A'} ${user.cognome || ''}`);
                    console.log(`   - Ruolo: ${user.ruolo}`);
                    console.log(`   - Attivo: ${user.attivo ? 'Sì' : 'No'}`);
                });
            }

            db.close((err) => {
                if (err) {
                    console.error('❌ Errore chiusura database:', err.message);
                } else {
                    console.log('\n✅ Database chiuso correttamente');
                }
            });
        });
    });
}

checkUsers();