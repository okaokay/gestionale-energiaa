const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./gestionale_energia.db');

console.log('🔍 Controllo struttura tabella import_logs...');

db.all('PRAGMA table_info(import_logs)', (err, rows) => {
    if (err) {
        console.error('❌ Errore:', err);
    } else {
        console.log('\n📋 Struttura tabella import_logs:');
        rows.forEach(row => {
            console.log(`- ${row.name} (${row.type})`);
        });
        
        const hasImportId = rows.some(row => row.name === 'import_id');
        console.log(`\n✅ Colonna import_id presente: ${hasImportId}`);
        
        if (!hasImportId) {
            console.log('\n⚠️  La colonna import_id non è presente. Aggiungendola...');
            
            db.run('ALTER TABLE import_logs ADD COLUMN import_id TEXT UNIQUE', (err) => {
                if (err) {
                    console.error('❌ Errore nell\'aggiungere la colonna:', err);
                } else {
                    console.log('✅ Colonna import_id aggiunta con successo!');
                }
                db.close();
            });
        } else {
            db.close();
        }
    }
});