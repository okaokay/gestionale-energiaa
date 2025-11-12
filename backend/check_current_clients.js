const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'gestionale_energia.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 VERIFICA STATO ATTUALE DATABASE');
console.log('=================================\n');

// Verifica clienti
db.get('SELECT COUNT(*) as count FROM clienti', [], (err, row) => {
    if (err) {
        console.error('❌ Errore clienti:', err.message);
        return;
    }
    console.log(`👥 Clienti attuali: ${row.count}`);
    
    // Verifica contratti luce
    db.get('SELECT COUNT(*) as count FROM contratti_luce', [], (err, row) => {
        if (err) {
            console.error('❌ Errore contratti luce:', err.message);
            return;
        }
        console.log(`⚡ Contratti luce: ${row.count}`);
        
        // Verifica contratti gas
        db.get('SELECT COUNT(*) as count FROM contratti_gas', [], (err, row) => {
            if (err) {
                console.error('❌ Errore contratti gas:', err.message);
                return;
            }
            console.log(`🔥 Contratti gas: ${row.count}`);
            
            // Verifica import logs
            db.get('SELECT COUNT(*) as count FROM import_logs', [], (err, row) => {
                if (err) {
                    console.error('❌ Errore import logs:', err.message);
                    return;
                }
                console.log(`📊 Import logs: ${row.count}`);
                
                console.log('\n✅ Verifica completata');
                db.close();
            });
        });
    });
});