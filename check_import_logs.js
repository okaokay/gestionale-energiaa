const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('gestionale_energia.db');

db.all('SELECT * FROM import_logs ORDER BY id DESC LIMIT 10', (err, rows) => {
    if (err) {
        console.error('Errore:', err);
    } else {
        console.log('ULTIMI LOG DI IMPORTAZIONE:');
        rows.forEach(log => {
            console.log(`ID: ${log.id}`);
            console.log(`Tipo: ${log.record_type}`);
            console.log(`Errore: ${log.error_type}`);
            console.log(`Dettagli: ${log.error_details}`);
            console.log('---');
        });
    }
    db.close();
});