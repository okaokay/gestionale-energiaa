const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('gestionale_energia.db');

console.log('STRUTTURA TABELLA import_logs:');
db.all('PRAGMA table_info(import_logs)', (err, rows) => {
    if (err) {
        console.error('Errore:', err);
    } else {
        rows.forEach(col => {
            console.log(`${col.name}: ${col.type}`);
        });
        
        // Ora recupera alcuni record per vedere i dati
        console.log('\nULTIMI RECORD:');
        db.all('SELECT * FROM import_logs ORDER BY id DESC LIMIT 3', (err, logs) => {
            if (err) {
                console.error('Errore nel recupero log:', err);
            } else {
                logs.forEach(log => {
                    console.log('Record:', log);
                });
            }
            db.close();
        });
    }
});