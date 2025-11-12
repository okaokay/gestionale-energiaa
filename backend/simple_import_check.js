const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 CONTROLLO SEMPLICE IMPORT LOGS\n');

// Query semplice per vedere gli ultimi import
db.all('SELECT * FROM import_logs ORDER BY import_date DESC LIMIT 3', [], (err, rows) => {
    if (err) {
        console.error('Errore:', err.message);
        db.close();
        return;
    }

    console.log(`Trovati ${rows.length} import:\n`);
    
    rows.forEach((row, index) => {
        console.log(`--- Import ${index + 1} ---`);
        console.log(`File: ${row.filename}`);
        console.log(`Totale righe: ${row.total_rows}`);
        console.log(`Successi: ${row.successful_imports}`);
        console.log(`Fallimenti: ${row.failed_imports}`);
        console.log(`Data: ${row.import_date}`);
        
        if (row.error_log) {
            console.log(`Error log: ${row.error_log.substring(0, 100)}...`);
            
            if (row.error_log.includes('[object Object]')) {
                console.log('❌ PROBLEMA: [object Object] trovato!');
            } else {
                console.log('✅ Error log OK');
            }
        } else {
            console.log('Error log: vuoto');
        }
        console.log('');
    });
    
    db.close();
});