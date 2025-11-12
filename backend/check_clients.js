const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../gestionale_energia.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Controllo clienti nel database...\n');

// Controlla clienti privati
db.all("SELECT * FROM clienti_privati ORDER BY id DESC LIMIT 5", (err, rows) => {
    if (err) {
        console.error('❌ Errore clienti privati:', err);
    } else {
        console.log('👤 Clienti Privati (ultimi 5):');
        console.table(rows);
    }
    
    // Controlla clienti azienda
    db.all("SELECT * FROM clienti_aziende ORDER BY id DESC LIMIT 5", (err, rows) => {
        if (err) {
            console.error('❌ Errore clienti azienda:', err);
        } else {
            console.log('\n🏢 Clienti Azienda (ultimi 5):');
            console.table(rows);
        }
        
        // Controlla contratti luce
        db.all("SELECT * FROM contratti_luce ORDER BY id DESC LIMIT 5", (err, rows) => {
            if (err) {
                console.error('❌ Errore contratti luce:', err);
            } else {
                console.log('\n💡 Contratti Luce (ultimi 5):');
                console.table(rows);
            }
            
            // Controlla contratti gas
            db.all("SELECT * FROM contratti_gas ORDER BY id DESC LIMIT 5", (err, rows) => {
                if (err) {
                    console.error('❌ Errore contratti gas:', err);
                } else {
                    console.log('\n🔥 Contratti Gas (ultimi 5):');
                    console.table(rows);
                }
                
                db.close();
            });
        });
    });
});