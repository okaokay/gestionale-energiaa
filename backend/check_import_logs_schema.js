const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');

console.log('🔍 CONTROLLO SCHEMA TABELLA import_logs');
console.log('========================================\n');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Errore connessione database:', err.message);
        return;
    }
    console.log('✅ Connesso al database SQLite\n');
});

// Controlla la struttura della tabella import_logs
db.all("PRAGMA table_info(import_logs)", [], (err, rows) => {
    if (err) {
        console.error('❌ Errore nel controllo schema:', err.message);
        db.close();
        return;
    }

    if (rows.length === 0) {
        console.log('❌ Tabella import_logs non trovata');
        db.close();
        return;
    }

    console.log('📊 SCHEMA TABELLA import_logs:');
    console.log('==============================');
    rows.forEach(row => {
        console.log(`   ${row.name} (${row.type}) - ${row.notnull ? 'NOT NULL' : 'NULL'} - ${row.pk ? 'PRIMARY KEY' : ''}`);
    });

    console.log('\n🔍 CONTENUTO TABELLA (ultimi 3 record):');
    console.log('========================================');
    
    db.all("SELECT * FROM import_logs ORDER BY id DESC LIMIT 3", [], (err, rows) => {
        if (err) {
            console.error('❌ Errore nel recupero dati:', err.message);
            db.close();
            return;
        }

        if (rows.length === 0) {
            console.log('❌ Nessun record trovato nella tabella import_logs');
        } else {
            rows.forEach((row, index) => {
                console.log(`\n📋 Record ${index + 1}:`);
                Object.entries(row).forEach(([key, value]) => {
                    if (key === 'error_log' && value) {
                        console.log(`   ${key}: [JSON - ${value.length} caratteri]`);
                    } else {
                        console.log(`   ${key}: ${value}`);
                    }
                });
            });
        }

        db.close();
        console.log('\n✅ Analisi completata');
    });
});