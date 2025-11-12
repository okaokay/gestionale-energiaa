const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../gestionale_energia.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Controllo tabelle nel database...\n');

// Lista tutte le tabelle
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error('❌ Errore:', err);
    } else {
        console.log('📋 Tabelle esistenti:');
        rows.forEach(row => {
            console.log(`  - ${row.name}`);
        });
        
        // Controlla la struttura della tabella clienti_privati
        console.log('\n🔍 Struttura tabella clienti_privati:');
        db.all("PRAGMA table_info(clienti_privati)", (err, columns) => {
            if (err) {
                console.error('❌ Errore:', err);
            } else {
                console.table(columns);
            }
            
            db.close();
        });
    }
});