const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

function checkImportLogs() {
    const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
            console.error('❌ Errore connessione database:', err.message);
            return;
        }
        console.log('✅ Connesso al database SQLite');
    });

    console.log('📋 CONTROLLO IMPORT LOGS:');
    console.log('================================\n');

    // Prima controllo la struttura della tabella
    db.all('PRAGMA table_info(import_logs)', (err, columns) => {
        if (err) {
            console.log('❌ Errore nel controllo struttura:', err.message);
        } else {
            console.log('📊 STRUTTURA TABELLA import_logs:');
            columns.forEach(col => {
                console.log(`- ${col.name} (${col.type})`);
            });
        }

        // Poi leggo tutti i dati disponibili
        db.all('SELECT * FROM import_logs ORDER BY id DESC LIMIT 10', (err, rows) => {
            if (err) {
                console.log('❌ Errore nel recupero logs:', err.message);
            } else if (rows.length === 0) {
                console.log('\n📭 Nessun log trovato');
            } else {
                console.log('\n📊 ULTIMI IMPORT LOGS:');
                rows.forEach((row, index) => {
                    console.log(`\n${index + 1}. Log ID: ${row.id}`);
                    Object.keys(row).forEach(key => {
                        if (row[key] !== null && row[key] !== '') {
                            console.log(`   ${key}: ${row[key]}`);
                        }
                    });
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
    });
}

checkImportLogs();