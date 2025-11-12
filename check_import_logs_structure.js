const sqlite3 = require('sqlite3').verbose();
const path = require('path');

async function checkImportLogsStructure() {
    console.log('🔍 CONTROLLO STRUTTURA IMPORT_LOGS');
    
    const dbPath = path.join(__dirname, 'gestionale_energia.db');
    const db = new sqlite3.Database(dbPath);
    
    try {
        // Controlla la struttura della tabella import_logs
        console.log('\n📋 STRUTTURA TABELLA import_logs:');
        const schema = await new Promise((resolve, reject) => {
            db.all("PRAGMA table_info(import_logs)", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        console.log('Colonne disponibili:');
        schema.forEach(col => {
            console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });
        
        // Conta i record nella tabella
        const count = await new Promise((resolve, reject) => {
            db.get("SELECT COUNT(*) as count FROM import_logs", (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        
        console.log(`\n📊 Record totali in import_logs: ${count}`);
        
        // Se ci sono record, mostra i primi 5
        if (count > 0) {
            console.log('\n📄 PRIMI 5 RECORD:');
            const records = await new Promise((resolve, reject) => {
                db.all("SELECT * FROM import_logs LIMIT 5", (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });
            
            records.forEach((record, index) => {
                console.log(`\n${index + 1}. Record:`);
                Object.entries(record).forEach(([key, value]) => {
                    console.log(`   ${key}: ${value}`);
                });
            });
        }
        
        // Controlla anche se ci sono altre tabelle che potrebbero contenere log di import
        console.log('\n🔍 ALTRE TABELLE CON "import" o "log" nel nome:');
        const allTables = await new Promise((resolve, reject) => {
            db.all("SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%import%' OR name LIKE '%log%')", (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
        
        for (const table of allTables) {
            const tableCount = await new Promise((resolve, reject) => {
                db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, row) => {
                    if (err) reject(err);
                    else resolve(row.count);
                });
            });
            console.log(`  - ${table.name}: ${tableCount} record`);
        }
        
    } catch (error) {
        console.error('❌ Errore:', error);
    } finally {
        db.close();
    }
}

checkImportLogsStructure().catch(console.error);