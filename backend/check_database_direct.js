const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

function checkDatabase() {
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Errore connessione database:', err.message);
            return;
        }
        console.log('✅ Connesso al database SQLite');
    });

    console.log('🔍 CONTROLLO TABELLE DATABASE:');
    console.log('================================\n');

    // Controllo clienti privati
    db.all("SELECT COUNT(*) as count FROM clienti_privati", (err, rows) => {
        if (err) {
            console.log('❌ Errore clienti_privati:', err.message);
        } else {
            console.log('👥 Clienti privati:', rows[0].count);
        }
    });

    // Controllo clienti aziende
    db.all("SELECT COUNT(*) as count FROM clienti_aziende", (err, rows) => {
        if (err) {
            console.log('❌ Errore clienti_aziende:', err.message);
        } else {
            console.log('🏢 Clienti aziende:', rows[0].count);
        }
    });

    // Controllo contratti luce
    db.all("SELECT COUNT(*) as count FROM contratti_luce", (err, rows) => {
        if (err) {
            console.log('❌ Errore contratti_luce:', err.message);
        } else {
            console.log('⚡ Contratti luce:', rows[0].count);
        }
    });

    // Controllo contratti gas
    db.all("SELECT COUNT(*) as count FROM contratti_gas", (err, rows) => {
        if (err) {
            console.log('❌ Errore contratti_gas:', err.message);
        } else {
            console.log('🔥 Contratti gas:', rows[0].count);
        }
    });

    // Controllo import logs
    db.all("SELECT COUNT(*) as count FROM import_logs", (err, rows) => {
        if (err) {
            console.log('❌ Errore import_logs:', err.message);
        } else {
            console.log('📋 Import logs:', rows[0].count);
        }
    });

    // Mostra ultimi clienti privati
    setTimeout(() => {
        console.log('\n📋 ULTIMI CLIENTI PRIVATI:');
        console.log('================================\n');
        
        db.all("SELECT nome, cognome, codice_fiscale, email_principale, created_at FROM clienti_privati ORDER BY created_at DESC LIMIT 5", (err, rows) => {
            if (err) {
                console.log('❌ Errore nel recupero clienti:', err.message);
            } else if (rows.length === 0) {
                console.log('📭 Nessun cliente trovato');
            } else {
                rows.forEach((row, index) => {
                    console.log(`${index + 1}. ${row.nome} ${row.cognome} (${row.codice_fiscale}) - ${row.email_principale} - ${row.created_at}`);
                });
            }
            
            // Chiudo la connessione
            db.close((err) => {
                if (err) {
                    console.error('❌ Errore chiusura database:', err.message);
                } else {
                    console.log('\n✅ Database chiuso');
                }
            });
        });
    }, 1000);
}

checkDatabase();