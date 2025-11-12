const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkAuditLog() {
    console.log('🔍 CONTROLLO AUDIT LOG');
    
    const dbPath = path.join(__dirname, 'gestionale_energia.db');
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Mostra tutti i record dell'audit_log
        console.log('\n📄 TUTTI I RECORD AUDIT_LOG:');
        const records = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM audit_log ORDER BY data_azione DESC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (records.length > 0) {
            records.forEach((record, index) => {
                console.log(`\n${index + 1}. Record:`);
                Object.entries(record).forEach(([key, value]) => {
                    console.log(`   ${key}: ${value}`);
                });
            });
        } else {
            console.log('   Nessun record trovato');
        }
        
        // Cerca specificamente azioni di import
        console.log('\n🔍 AZIONI DI IMPORT:');
        const importActions = await new Promise((resolve, reject) => {
            db.all("SELECT * FROM audit_log WHERE tipo_azione LIKE '%import%' OR descrizione LIKE '%import%' ORDER BY data_azione DESC", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        if (importActions.length > 0) {
            importActions.forEach((record, index) => {
                console.log(`\n${index + 1}. Azione Import:`);
                console.log(`   Tipo: ${record.tipo_azione}`);
                console.log(`   Descrizione: ${record.descrizione}`);
                console.log(`   Data: ${record.data_azione}`);
                console.log(`   Utente: ${record.utente_nome}`);
            });
        } else {
            console.log('   Nessuna azione di import trovata');
        }
        
    } catch (error) {
        console.error('❌ Errore:', error);
    } finally {
        db.close();
    }
}

checkAuditLog().catch(console.error);